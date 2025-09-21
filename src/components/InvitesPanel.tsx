// src/components/InvitesPanel.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type InviteRow = {
  id: string;
  token: string;
  email: string | null;
  isPublic: boolean;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
};

type ApiPayload = {
  ok: boolean;
  open: InviteRow[];
  accepted: InviteRow[];
  denied: InviteRow[];
  error?: string;
};

export default function InvitesPanel({ leagueId }: { leagueId: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiPayload | null>(null);

  const [openOpen, setOpenOpen] = useState(true);
  const [openAccepted, setOpenAccepted] = useState(false);
  const [openDenied, setOpenDenied] = useState(false);

  const fetchInvites = useCallback(async () => {
    try {
      setErr(null);
      setLoading(true);
      const r = await fetch(`/api/leagues/${leagueId}/invites`, { cache: "no-store" });
      const j = (await r.json()) as ApiPayload;
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "Failed to load invites.");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const revoke = useCallback(
    async (id: string) => {
      if (!confirm("Revoke this invite? This cannot be undone.")) return;
      try {
        const r = await fetch("/api/invites/revoke", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
        await fetchInvites();
      } catch (e: any) {
        alert(e?.message || "Failed to revoke invite.");
      }
    },
    [fetchInvites]
  );

  const fmt = useMemo(() => {
    const d = (s?: string | null) => (s ? new Date(s).toLocaleString() : "—");
    return { d };
  }, []);

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url).then(
      () => alert("Invite link copied!"),
      () => alert(url)
    );
  };

  if (loading) return <div className="text-sm text-gray-400">Loading invites…</div>;
  if (err) return <div className="text-sm text-red-400">Error: {err}</div>;
  if (!data) return null;

  const Section = ({
    label,
    count,
    open,
    setOpen,
    children,
  }: {
    label: string;
    count: number;
    open: boolean;
    setOpen: (v: boolean) => void;
    children: React.ReactNode;
  }) => (
    <div className="border border-gray-700 rounded-xl mb-3 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-800/50"
      >
        <span className="font-semibold">
          {label} <span className="text-gray-400">({count})</span>
        </span>
        <span className="text-xs text-gray-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );

  const Table = ({
    rows,
    actions,
  }: {
    rows: InviteRow[];
    actions?: (r: InviteRow) => JSX.Element;
  }) =>
    rows.length === 0 ? (
      <div className="text-xs text-gray-400 px-1 py-2">No rows.</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left py-1 pr-2">Email</th>
              <th className="text-left py-1 pr-2">Created</th>
              <th className="text-left py-1 pr-2">Expires</th>
              <th className="text-left py-1 pr-2">Status</th>
              <th className="text-left py-1 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-800">
                <td className="py-1 pr-2">{r.isPublic ? <em>Public link</em> : r.email}</td>
                <td className="py-1 pr-2">{fmt.d(r.created_at)}</td>
                <td className="py-1 pr-2">{fmt.d(r.expires_at)}</td>
                <td className="py-1 pr-2">
                  {r.revoked_at
                    ? `Revoked ${fmt.d(r.revoked_at)}`
                    : r.accepted_at
                    ? `Accepted ${fmt.d(r.accepted_at)}`
                    : r.expires_at && new Date(r.expires_at) <= new Date()
                    ? "Expired"
                    : "Open"}
                </td>
                <td className="py-1 pr-2">
                  {actions ? actions(r) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="mt-3">
      {/* OPEN */}
      <Section label="Open Invites" count={data.open.length} open={openOpen} setOpen={setOpenOpen}>
        <Table
          rows={data.open}
          actions={(r) => (
            <div className="flex items-center gap-2">
              <a
                href={`/invite/${r.token}`}
                target="_blank"
                className="text-xs underline hover:no-underline"
              >
                Open
              </a>
              <button
                className="text-xs underline hover:no-underline"
                onClick={() => copyLink(r.token)}
              >
                Copy
              </button>
              <button
                className="text-xs text-red-400 underline hover:no-underline"
                onClick={() => revoke(r.id)}
              >
                Revoke
              </button>
            </div>
          )}
        />
      </Section>

      {/* ACCEPTED */}
      <Section
        label="Accepted"
        count={data.accepted.length}
        open={openAccepted}
        setOpen={setOpenAccepted}
      >
        <Table rows={data.accepted} />
      </Section>

      {/* DENIED (revoked/expired) — public (no-email) omitted by API */}
      <Section
        label="Denied / Expired"
        count={data.denied.length}
        open={openDenied}
        setOpen={setOpenDenied}
      >
        <Table rows={data.denied} />
      </Section>
    </div>
  );
}
