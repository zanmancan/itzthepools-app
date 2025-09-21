// src/components/InvitesPanel.tsx
"use client";

/**
 * InvitesPanel
 * - Renders Open / Accepted / Denied buckets
 * - Adds "Revoke" button for Open invites (owner/admin only)
 * - Strong error handling
 */

import { useEffect, useMemo, useState } from "react";

export type InviteRow = {
  id: string;
  token: string;
  email: string | null;
  is_public?: boolean | null;
  isPublic?: boolean | null;
  created_at: string | null;
  expires_at: string | null;
  accepted_at?: string | null;
  accepted?: boolean | null;
  revoked_at: string | null;
};

type ApiResponse =
  | { ok: true; open: InviteRow[]; accepted: InviteRow[]; denied: InviteRow[] }
  | { ok?: false; error?: string; open?: InviteRow[]; accepted?: InviteRow[]; denied?: InviteRow[] };

export default function InvitesPanel({ leagueId, canManage = true }: { leagueId: string; canManage?: boolean }) {
  const [data, setData] = useState<{ open: InviteRow[]; accepted: InviteRow[]; denied: InviteRow[] }>({
    open: [],
    accepted: [],
    denied: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function fetchInvites() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/invites`, { cache: "no-store" });
      const body: ApiResponse = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setError((body as any)?.error || `HTTP ${res.status}`);
        setData({ open: [], accepted: [], denied: [] });
        return;
      }
      setData({
        open: Array.isArray(body.open) ? body.open : [],
        accepted: Array.isArray(body.accepted) ? body.accepted : [],
        denied: Array.isArray((body as any).denied) ? (body as any).denied : [],
      });
    } catch (e: any) {
      setError(e?.message || String(e));
      setData({ open: [], accepted: [], denied: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  async function revokeInvite(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Revoke failed: ${(body && body.error) || `HTTP ${res.status}`}`);
        return;
      }
      await fetchInvites();
    } catch (e: any) {
      alert(`Revoke failed: ${e?.message || String(e)}`);
    } finally {
      setBusyId(null);
    }
  }

  const counters = useMemo(
    () => ({
      open: data.open?.length ?? 0,
      accepted: data.accepted?.length ?? 0,
      denied: data.denied?.length ?? 0,
    }),
    [data]
  );

  return (
    <div className="rounded-lg border border-gray-800 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-300">Invites</div>
        <button
          type="button"
          onClick={() => void fetchInvites()}
          disabled={loading}
          className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-100 hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Reload"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
          <div className="font-semibold">There was a problem loading invites.</div>
          <div className="mt-1 leading-snug">{error}</div>
        </div>
      )}

      <Details title={`Open (${counters.open})`} defaultOpen>
        <Table
          rows={data.open}
          empty="No open invites."
          showRevoke={canManage}
          onRevoke={(id) => void revokeInvite(id)}
          busyId={busyId}
        />
      </Details>

      <Details title={`Accepted (${counters.accepted})`}>
        <Table rows={data.accepted} empty="No accepted invites yet." />
      </Details>

      <Details title={`Denied / Expired (${counters.denied})`}>
        <Table rows={data.denied} empty="No denied/expired invites." />
      </Details>
    </div>
  );
}

function Details({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="mb-3 rounded border border-gray-800 bg-gray-950/40" open={defaultOpen}>
      <summary className="cursor-pointer select-none px-3 py-2 font-medium text-gray-200 hover:bg-gray-900/60">
        {title}
      </summary>
      <div className="px-3 pb-3 pt-2">{children}</div>
    </details>
  );
}

function Table({
  rows,
  empty,
  showRevoke = false,
  onRevoke,
  busyId,
}: {
  rows: InviteRow[];
  empty: string;
  showRevoke?: boolean;
  onRevoke?: (id: string) => void;
  busyId?: string | null;
}) {
  if (!rows || rows.length === 0) return <div className="text-sm text-gray-400">{empty}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-800 text-gray-300">
          <tr>
            <th className="py-1 pr-3">When</th>
            <th className="py-1 pr-3">Email</th>
            <th className="py-1 pr-3">Expires</th>
            <th className="py-1 pr-3">Type</th>
            <th className="py-1 pr-3">Link</th>
            {showRevoke && <th className="py-1 pr-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pub = (r.isPublic ?? r.is_public) ? true : false;
            const inviteUrl = `/invite/${r.token}`;
            const isBusy = busyId === r.id;
            return (
              <tr key={r.id} className="border-b border-gray-900/40">
                <td className="py-1 pr-3 text-gray-300">{fmtDateTime(r.created_at)}</td>
                <td className="py-1 pr-3">{pub ? <span className="text-gray-400">—</span> : r.email}</td>
                <td className="py-1 pr-3">{fmtDateTime(r.expires_at) || <span className="text-gray-400">—</span>}</td>
                <td className="py-1 pr-3">{pub ? "Public Link" : "Email Invite"}</td>
                <td className="py-1 pr-3">
                  <CopyButton text={inviteUrl} label="Copy" />
                </td>
                {showRevoke && (
                  <td className="py-1 pr-3 text-right">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onRevoke && onRevoke(r.id)}
                      className="rounded bg-red-900/50 px-2 py-0.5 text-xs text-red-100 hover:bg-red-800 disabled:opacity-50"
                    >
                      {isBusy ? "Revoking…" : "Revoke"}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  async function doCopy() {
    try {
      const value = text.startsWith("http") ? text : `${location.origin}${text}`;
      await navigator.clipboard.writeText(value);
      alert("Invite link copied to clipboard.");
    } catch (e: any) {
      alert(`Copy failed: ${e?.message || String(e)}`);
    }
  }
  return (
    <button
      type="button"
      onClick={() => void doCopy()}
      className="rounded bg-gray-800 px-2 py-0.5 text-xs hover:bg-gray-700"
    >
      {label}
    </button>
  );
}

function fmtDateTime(v: string | null): string {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(+d)) return v;
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return v;
  }
}
