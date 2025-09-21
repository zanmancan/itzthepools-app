"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { devlog } from "@/lib/devlog";

type InviteRow = {
  id: string;
  email: string | null;
  token: string;
  created_at: string | null;
  expires_at: string | null;
  accepted: boolean | null;
  revoked_at: string | null;
};

type Props = { leagueId: string };

export default function LeagueInvitePanel({ leagueId }: Props) {
  const [openInvites, setOpenInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchOpenInvites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/invites?status=open`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load invites");

      const rows: InviteRow[] = (json?.invites ?? []).map((r: any) => ({
        id: String(r.id),
        email: r.email ?? null,
        token: String(r.token),
        created_at: r.created_at ?? null,
        expires_at: r.expires_at ?? null,
        accepted: r.accepted ?? null,
        revoked_at: r.revoked_at ?? null,
      }));

      setOpenInvites(rows);
    } catch (e: any) {
      devlog("[LeagueInvitePanel] fetch error:", e?.message || e);
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => { void fetchOpenInvites(); }, [fetchOpenInvites]);

  const revoke = useCallback(
    async (id: string) => {
      try {
        startTransition(() => {});
        const res = await fetch("/api/invites/revoke", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, reason: "owner_revoked" }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Revoke failed");
        await fetchOpenInvites();
      } catch (e: any) {
        alert(`Revoke failed: ${e?.message || e}`);
      }
    },
    [fetchOpenInvites]
  );

  const rows = useMemo(() => openInvites, [openInvites]);

  return (
    <div className="rounded border border-gray-700 mt-3">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-sm font-medium">Open Invites</div>
        {(loading || isPending) && <span className="text-xs text-gray-400">Refreshing…</span>}
      </div>
      <div className="border-t border-gray-700">
        <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs text-gray-400">
          <div>Issued</div><div>Expires</div><div>Status</div><div>Actions</div>
        </div>
        <div className="divide-y divide-gray-800">
          {rows.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-500">No pending invites.</div>
          )}
          {rows.map((r) => {
            const created = r.created_at ? new Date(r.created_at).toLocaleString() : "—";
            const expires = r.expires_at ? new Date(r.expires_at).toLocaleString() : "—";
            const url = `${location.origin}/invite/${r.token}`;
            return (
              <div key={r.id} className="grid grid-cols-4 gap-2 px-3 py-2 text-sm">
                <div>{created}</div>
                <div>{expires}</div>
                <div className="text-green-400">Open</div>
                <div className="space-x-3">
                  <a className="underline" href={url} target="_blank" rel="noreferrer">Open</a>
                  <button className="underline" onClick={() => navigator.clipboard.writeText(url)}>Copy</button>
                  <button className="text-red-400 underline" onClick={() => revoke(r.id)}>Revoke</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
