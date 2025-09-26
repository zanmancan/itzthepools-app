"use client";

/**
 * DashboardInvitesPanel
 * - Prefers /api/invites/mine when NEXT_PUBLIC_USE_SUPABASE=1
 * - Falls back to /api/test/invites/list in dev
 * - Shows Revoke button only when canRevoke=true (owner/admin)
 * - UL[data-testid="pending-invites"] with LI[data-testid="invite-row"]
 * - Each LI includes data-token="<invite.token>" for E2E revoke test
 * - Revoke uses /api/invites/revoke (dev proxy) — write path stays in-memory
 */

import { useEffect, useState } from "react";

const USE_SB = process.env.NEXT_PUBLIC_USE_SUPABASE === "1";

type InviteRow = {
  token: string;
  email: string;
  leagueId: string;
  leagueName: string;
  expiresAt: number;
  consumedAt?: number | null;
  // Supabase read returns rows without canRevoke; we compute client-side = false
  canRevoke?: boolean;
};

async function fetchList(): Promise<InviteRow[]> {
  try {
    if (USE_SB) {
      // Read-only via Supabase API
      const res = await fetch("/api/invites/mine", { cache: "no-store", credentials: "same-origin" });
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        const list: InviteRow[] = Array.isArray(j?.invites) ? j.invites : [];
        // In Supabase mode we don't know the owner on the client; hide revoke by default.
        return list.map(r => ({ ...r, canRevoke: false }));
      }
      // fall through to dev list if 404/other
    }

    // Dev/test read: everyone sees rows; canRevoke is computed server-side
    const res = await fetch("/api/test/invites/list", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return [];
    const j = await res.json().catch(() => ({}));
    return Array.isArray(j?.invites) ? (j.invites as InviteRow[]) : [];
  } catch {
    return [];
  }
}

export default function DashboardInvitesPanel() {
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    try {
      const list = await fetchList();
      setRows(list);
    } catch (e: any) {
      setErr(e?.message || "Failed to load invites.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      await refresh();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function onRevoke(token: string) {
    // NOTE: Revoke remains dev-only (in-memory)
    try {
      const res = await fetch("/api/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to revoke invite.");
    }
  }

  return (
    <section
      className="rounded-xl border border-neutral-800 bg-neutral-900"
      data-testid="invites-panel"
    >
      <header className="px-4 py-3 border-b border-neutral-800">
        <h2 className="text-lg font-semibold">Pending Invites</h2>
      </header>

      {loading ? (
        <div className="p-4 text-sm text-neutral-400">Loading…</div>
      ) : err ? (
        <div className="p-4 text-sm text-red-400">{err}</div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-sm text-neutral-400">No pending invites.</div>
      ) : (
        <ul className="divide-y divide-neutral-800" data-testid="pending-invites">
          {rows.map((r) => (
            <li
              key={r.token}
              className="px-4 py-3 text-sm"
              data-testid="invite-row"
              data-token={r.token}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.email}</div>
                  <div className="text-xs text-neutral-400">
                    {r.leagueName} · <code className="opacity-75">{r.leagueId}</code>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-neutral-400">
                    exp {new Date(r.expiresAt).toLocaleDateString()}
                  </div>
                  {r.canRevoke && (
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      data-testid="revoke-invite"
                      onClick={() => onRevoke(r.token!)}
                      aria-label={`Revoke invite to ${r.email}`}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
