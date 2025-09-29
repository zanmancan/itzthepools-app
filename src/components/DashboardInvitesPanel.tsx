"use client";

/**
 * DashboardInvitesPanel
 * - Read-only list of latest invites across the in-memory dev store.
 * - In dev (NEXT_PUBLIC_USE_SUPABASE !== "1"), fetches /api/test/invites/list.
 * - Renders one row per invite with:
 *     • data-testid="invite-row"
 *     • a Revoke button data-testid="revoke-invite"
 * - The Revoke button calls /api/test/invites/revoke and refreshes the list.
 * - We always render the button in dev; it’s disabled if already revoked.
 */

import { useEffect, useMemo, useState } from "react";

type Invite = {
  id: string;
  email: string;
  leagueId: string;
  leagueName: string;
  createdAt: string;
  revoked?: boolean;
};

const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === "1";

export default function DashboardInvitesPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);

  const listUrl = useMemo(
    () => (USE_SUPABASE ? "/api/invites/list" : "/api/test/invites/list"),
    []
  );
  const revokeUrl = useMemo(
    () => (USE_SUPABASE ? "/api/invites/revoke" : "/api/test/invites/revoke"),
    []
  );

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(listUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || json.ok === false) throw new Error(json?.error || "failed");
      const arr: Invite[] = Array.isArray(json.invites) ? json.invites : [];
      arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      setInvites(arr);
    } catch (e: any) {
      console.error("[DashboardInvitesPanel] load error:", e);
      setErr(e?.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }

  async function onRevoke(token: string) {
    try {
      setRevoking(token);
      const res = await fetch(revokeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Failed to revoke ${token}`);
      }
      await load();
    } catch (e) {
      console.error("[DashboardInvitesPanel] revoke error:", e);
      // soft-fail; keep UI responsive
    } finally {
      setRevoking(null);
    }
  }

  useEffect(() => {
    load();
  }, [listUrl]);

  return (
    <section
      className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 shadow"
      data-testid="invites-panel"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Invites</h2>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-neutral-700 px-3 py-1 text-xs hover:bg-neutral-800"
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-sm text-neutral-400">Loading…</div>}
      {err && (
        <div className="rounded-md border border-red-800 bg-red-950/40 p-2 text-sm text-red-300">
          Error: {err}
        </div>
      )}

      {!loading && !err && invites.length === 0 && (
        <div className="text-sm text-neutral-400">No invites yet.</div>
      )}

      {invites.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr>
                <th className="py-1 pr-3">Email</th>
                <th className="py-1 pr-3">League</th>
                <th className="py-1 pr-3">Created</th>
                <th className="py-1 pr-3">Status</th>
                <th className="py-1 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id} data-testid="invite-row" className="border-t border-neutral-800">
                  <td className="py-2 pr-3">{inv.email}</td>
                  <td className="py-2 pr-3">{inv.leagueName}</td>
                  <td className="py-2 pr-3">{new Date(inv.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-3">{inv.revoked ? "Revoked" : "Active"}</td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      data-testid="revoke-invite"
                      onClick={() => onRevoke(inv.id)}
                      disabled={!!inv.revoked || revoking === inv.id}
                      className="rounded-md border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800 disabled:opacity-50"
                      title={inv.revoked ? "Already revoked" : "Revoke invite"}
                    >
                      {revoking === inv.id ? "Revoking…" : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
