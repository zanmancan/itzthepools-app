"use client";

import React from "react";

type InviteRow = {
  id: string;
  league_id: string;
  email: string | null;
  token: string | null;
  created_at: string;
  expires_at: string | null;
  accepted: boolean | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
  is_public?: boolean | null;
};

type Props = {
  leagueId: string;
  canManage: boolean; // true for owner/admin
};

type Buckets = {
  open: InviteRow[];
  accepted: InviteRow[];
  denied: InviteRow[];
};

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return v || "—";
  }
}

export default function InvitesPanel({ leagueId, canManage }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [buckets, setBuckets] = React.useState<Buckets>({ open: [], accepted: [], denied: [] });
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // create invite form
  const [email, setEmail] = React.useState("");
  const [asPublic, setAsPublic] = React.useState(false);
  const [days, setDays] = React.useState<number | "">("");
  const [creating, setCreating] = React.useState(false);

  // copy feedback (per-row)
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // sections: all collapsed by default
  const [secOpen, setSecOpen] = React.useState<{ open: boolean; accepted: boolean; denied: boolean }>({
    open: false,
    accepted: false,
    denied: false,
  });
  const toggle = (k: keyof typeof secOpen) => setSecOpen((s) => ({ ...s, [k]: !s[k] }));

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/list?leagueId=${encodeURIComponent(leagueId)}`, {
        method: "GET",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok || j?.error) {
        setError(j?.error || `Failed to load invites (HTTP ${res.status})`);
        setBuckets({ open: [], accepted: [], denied: [] });
      } else {
        setBuckets({
          open: Array.isArray(j.open) ? j.open : [],
          accepted: Array.isArray(j.accepted) ? j.accepted : [],
          denied: Array.isArray(j.denied) ? j.denied : [],
        });
      }
    } catch (e: any) {
      setError(e?.message || "Network error loading invites.");
      setBuckets({ open: [], accepted: [], denied: [] });
    } finally {
      setLoading(false);
      // Keep collapsed on (re)load
      setSecOpen({ open: false, accepted: false, denied: false });
    }
  }, [leagueId]);

  React.useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  async function revoke(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/invites/revoke", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!res.ok || j?.error) {
        setError(j?.error || `Failed to revoke (HTTP ${res.status})`);
        return;
      }

      // optimistic update
      setBuckets((prev) => {
        const before = prev.open.length;
        const found = prev.open.find((x) => x.id === id);
        const nextOpen = prev.open.filter((x) => x.id !== id);
        const nextDenied = found
          ? [{ ...found, revoked_at: j.revoked_at || new Date().toISOString() }, ...prev.denied]
          : prev.denied;
        if (before > 0 && nextOpen.length === 0) setSecOpen((s) => ({ ...s, open: false }));
        return { open: nextOpen, accepted: prev.accepted, denied: nextDenied };
      });
    } catch (e: any) {
      setError(e?.message || "Network error revoking invite.");
    } finally {
      setBusyId(null);
    }
  }

  function copyLink(inv: InviteRow) {
    const base = window.location.origin;
    const path = inv.is_public
      ? `/join/public?token=${encodeURIComponent(inv.token || "")}`
      : `/join/invite?token=${encodeURIComponent(inv.token || "")}`;

    navigator.clipboard.writeText(`${base}${path}`).then(
      () => {
        setCopiedId(inv.id);
        window.setTimeout(() => setCopiedId(null), 1200);
      },
      () => {
        setError("Copy failed. You can highlight the link text and copy manually.");
      }
    );
  }

  async function onCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // simple validation: either public OR email
    const trimmed = email.trim();
    if (!asPublic && !trimmed) {
      setError("Enter an email or check 'Public link'.");
      return;
    }
    const ttl = days === "" ? undefined : Number(days);
    if (ttl !== undefined && (!Number.isFinite(ttl) || ttl <= 0)) {
      setError("Days must be a positive number.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/invites/create", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leagueId,
          email: asPublic ? undefined : trimmed,
          public: asPublic,
          days: ttl,
        }),
      });
      const j = await res.json();
      if (!res.ok || j?.error) {
        setError(j?.error || `Create failed (HTTP ${res.status})`);
        return;
      }

      const inv: InviteRow | null = j?.invite || null;
      if (inv) {
        // add to Open and auto-expand Open
        setBuckets((prev) => ({ ...prev, open: [inv, ...prev.open] }));
        setSecOpen((s) => ({ ...s, open: true }));
      }

      // reset form (keep days)
      setEmail("");
      setAsPublic(false);
    } catch (e: any) {
      setError(e?.message || "Network error creating invite.");
    } finally {
      setCreating(false);
    }
  }

  if (!canManage) return null; // member view: no invite tools

  return (
    <div className="rounded-lg border border-gray-800 bg-black/25">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-sm font-medium text-gray-300">Invites</div>
        <button
          type="button"
          onClick={load}
          className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700"
          disabled={loading}
        >
          {loading ? "Loading…" : "Reload"}
        </button>
      </div>

      {/* Create invite (owner/admin only) */}
      <form onSubmit={onCreateInvite} className="mx-3 mb-3 rounded-md border border-gray-800 bg-gray-900/40 p-3">
        <div className="mb-2 text-sm font-medium text-gray-200">Invite someone</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="email"
            placeholder="invitee@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={creating || asPublic}
            className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-500 sm:max-w-md"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create invite"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-300">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={asPublic}
              onChange={(e) => setAsPublic(e.target.checked)}
              disabled={creating}
              className="h-4 w-4 accent-blue-600"
            />
            Make this a public link (no email required)
          </label>

          <label className="inline-flex items-center gap-2">
            Expires in
            <input
              type="number"
              min={1}
              placeholder="7"
              value={days}
              onChange={(e) => setDays(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={creating}
              className="w-16 rounded-md border border-gray-700 bg-black/40 px-2 py-1 text-sm text-gray-100 outline-none focus:border-gray-500"
            />
            days
          </label>
        </div>
      </form>

      {error && (
        <div className="mx-3 mb-2 rounded-md border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Open */}
      <div className="mx-3 mb-3 rounded-md border border-gray-800 bg-gray-900/40">
        <button
          type="button"
          className="flex w-full cursor-pointer select-none items-center justify-between px-3 py-2 text-left text-sm text-gray-200"
          onClick={() => toggle("open")}
        >
          <span>Open ({buckets.open.length})</span>
          <span className="text-gray-500">{secOpen.open ? "▾" : "▸"}</span>
        </button>
        {secOpen.open && (
          <>
            {buckets.open.length === 0 ? (
              <div className="px-3 pb-3 text-sm text-gray-400">No open invites.</div>
            ) : (
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400">
                    <tr>
                      <th className="py-2 pr-3">When</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Expires</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Link</th>
                      <th className="py-2 pr-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="align-middle text-gray-100">
                    {buckets.open.map((inv) => (
                      <tr key={inv.id} className="border-t border-gray-800/70">
                        <td className="py-2 pr-3">{fmtDateTime(inv.created_at)}</td>
                        <td className="py-2 pr-3">{inv.email || "—"}</td>
                        <td className="py-2 pr-3">{fmtDateTime(inv.expires_at)}</td>
                        <td className="py-2 pr-3">{inv.is_public ? "Public Link" : "Email Invite"}</td>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            className={`rounded px-2 py-1 text-xs ${
                              copiedId === inv.id ? "bg-green-700 text-white" : "bg-gray-700 hover:bg-gray-600"
                            }`}
                            onClick={() => copyLink(inv)}
                          >
                            {copiedId === inv.id ? "Copied!" : "Copy"}
                          </button>
                        </td>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            disabled={busyId === inv.id}
                            onClick={() => revoke(inv.id)}
                            className={`rounded px-2 py-1 text-xs ${
                              busyId === inv.id
                                ? "cursor-wait bg-gray-700 text-gray-300"
                                : "bg-red-900 text-red-100 hover:bg-red-800"
                            }`}
                            title="Revoke invite"
                          >
                            {busyId === inv.id ? "Revoking…" : "Revoke"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Accepted */}
      <div className="mx-3 mb-3 rounded-md border border-gray-800 bg-gray-900/40">
        <button
          type="button"
          className="flex w-full cursor-pointer select-none items-center justify-between px-3 py-2 text-left text-sm text-gray-200"
          onClick={() => toggle("accepted")}
        >
          <span>Accepted ({buckets.accepted.length})</span>
          <span className="text-gray-500">{secOpen.accepted ? "▾" : "▸"}</span>
        </button>
        {secOpen.accepted && (
          <>
            {buckets.accepted.length === 0 ? (
              <div className="px-3 pb-3 text-sm text-gray-400">No accepted invites.</div>
            ) : (
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400">
                    <tr>
                      <th className="py-2 pr-3">When</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Accepted</th>
                    </tr>
                  </thead>
                  <tbody className="align-middle text-gray-100">
                    {buckets.accepted.map((inv) => (
                      <tr key={inv.id} className="border-t border-gray-800/70">
                        <td className="py-2 pr-3">{fmtDateTime(inv.created_at)}</td>
                        <td className="py-2 pr-3">{inv.email || "—"}</td>
                        <td className="py-2 pr-3">{fmtDateTime(inv.accepted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Denied / Expired */}
      <div className="mx-3 mb-3 rounded-md border border-gray-800 bg-gray-900/40">
        <button
          type="button"
          className="flex w-full cursor-pointer select-none items-center justify-between px-3 py-2 text-left text-sm text-gray-200"
          onClick={() => toggle("denied")}
        >
          <span>Denied / Expired ({buckets.denied.length})</span>
          <span className="text-gray-500">{secOpen.denied ? "▾" : "▸"}</span>
        </button>
        {secOpen.denied && (
          <>
            {buckets.denied.length === 0 ? (
              <div className="px-3 pb-3 text-sm text-gray-400">No denied/expired invites.</div>
            ) : (
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400">
                    <tr>
                      <th className="py-2 pr-3">When</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Revoked / Expired</th>
                    </tr>
                  </thead>
                  <tbody className="align-middle text-gray-100">
                    {buckets.denied.map((inv) => (
                      <tr key={inv.id} className="border-t border-gray-800/70">
                        <td className="py-2 pr-3">{fmtDateTime(inv.created_at)}</td>
                        <td className="py-2 pr-3">{inv.email || "—"}</td>
                        <td className="py-2 pr-3">
                          {inv.revoked_at ? `Revoked: ${fmtDateTime(inv.revoked_at)}` : "Expired"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
