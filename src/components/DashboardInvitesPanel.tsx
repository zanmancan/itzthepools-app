"use client";

import * as React from "react";

type Invite = {
  email: string;
  leagueId: string;
  createdAt?: string;
  token?: string;
  status?: string; // "Active" | "Revoked"
};

async function fetchInvites(): Promise<Invite[]> {
  const r = await fetch("/api/test/invites", { cache: "no-store" });
  const j = await r.json();
  if (!j?.ok) throw new Error(j?.error || "Failed to fetch invites");
  return (j.invites as Invite[]) ?? [];
}

async function postRevoke(payload: { leagueId: string; email?: string; token?: string }) {
  const r = await fetch("/api/test/invites/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!j?.ok) throw new Error(j?.error || "Failed to revoke invite");
  return j;
}

export default function DashboardInvitesPanel() {
  const [rows, setRows] = React.useState<Invite[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setRows(await fetchInvites());
    } catch (e: any) {
      setError(e?.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const onRevoke = React.useCallback(async (row: Invite) => {
    try {
      setBusy(row.email || row.token || "row");
      await postRevoke({ leagueId: row.leagueId, email: row.email, token: row.token });
      await load();
    } catch (e: any) {
      setError(e?.message || "Revoke failed");
    } finally {
      setBusy(null);
    }
  }, [load]);

  return (
    <section data-testid="invites-panel" className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Invites</h2>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
          aria-label="Refresh"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-white/60">
            <tr>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">League</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="py-6 text-center text-white/60">Loading…</td></tr>
            )}
            {!loading && (rows?.length ?? 0) === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-white/60">(no invites yet)</td></tr>
            )}
            {!loading && rows?.map((r) => (
              <tr key={(r.token || r.email) + r.leagueId} className="border-t border-white/10">
                <td className="py-2 pr-4">{r.email}</td>
                <td className="py-2 pr-4">{r.leagueId}</td>
                <td className="py-2 pr-4">{r.createdAt ?? ""}</td>
                <td className="py-2 pr-4">{r.status ?? "Active"}</td>
                <td className="py-2 pr-2">
                  <button
                    data-testid="revoke-invite"
                    type="button"
                    disabled={!!busy}
                    aria-busy={busy === (r.email || r.token || "row")}
                    onClick={() => onRevoke(r)}
                    className="rounded-md border border-white/20 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
