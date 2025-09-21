"use client";

import { useEffect, useMemo, useState } from "react";
import { devlog, deverror } from "@/lib/devlog";

type Props = { leagueId: string };

type InviteLite = {
  id: string;
  token: string | null;
  email: string | null;
  created_at: string;
  expires_at: string | null;
  accepted: boolean;
  revoked_at: string | null;
};

type InviteBuckets = {
  open: InviteLite[];
  accepted: InviteLite[];
  revoked: InviteLite[];
};

export default function LeagueInvitePanel({ leagueId }: Props) {
  const [data, setData] = useState<InviteBuckets>({
    open: [],
    accepted: [],
    revoked: [],
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showOpen, setShowOpen] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`/api/leagues/${leagueId}/invites`, {
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => ({}));
      devlog("[panel] invites load", res.status, json);

      if (!res.ok || json?.error) {
        setErr(json?.error || "Failed to load invites.");
        setData({ open: [], accepted: [], revoked: [] });
        setLoading(false);
        return;
      }

      // Defensive: coerce to arrays
      setData({
        open: Array.isArray(json?.open) ? json.open : [],
        accepted: Array.isArray(json?.accepted) ? json.accepted : [],
        revoked: Array.isArray(json?.revoked) ? json.revoked : [],
      });
      setLoading(false);
    } catch (e: any) {
      deverror("[panel] invites load exception", e);
      setErr("Failed to load invites.");
      setData({ open: [], accepted: [], revoked: [] });
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  const openCount = (data?.open?.length ?? 0);
  const acceptedCount = (data?.accepted?.length ?? 0);
  const revokedCount = (data?.revoked?.length ?? 0);

  async function revoke(id?: string, token?: string) {
    try {
      const res = await fetch("/api/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id, token }),
      });
      const json = await res.json().catch(() => ({}));
      devlog("[panel] revoke", res.status, json);

      if (!res.ok || json?.error) {
        setErr(json?.error || "Failed to revoke invite.");
        return;
      }

      // Remove from open list
      setData((prev) => ({
        ...prev,
        open: (prev.open ?? []).filter(
          (i) => i.id !== id && (token ? i.token !== token : true)
        ),
        revoked: prev.revoked, // leave as-is; we don’t refetch to keep UI snappy
      }));
    } catch (e: any) {
      deverror("[panel] revoke exception", e);
      setErr("Failed to revoke invite.");
    }
  }

  const hasAny = useMemo(
    () => openCount + acceptedCount + revokedCount > 0,
    [openCount, acceptedCount, revokedCount]
  );

  return (
    <div className="mt-3 space-y-3">
      <div className="text-xs text-gray-400">
        {loading ? "Loading invites…" : hasAny ? null : "No invites yet."}
        {err && <span className="text-red-400 ml-2">{err}</span>}
      </div>

      {/* Open invites */}
      <div className="rounded border border-gray-700">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <div className="text-sm font-medium">
            Open Invites ({openCount})
          </div>
          <button
            className="text-xs text-blue-400 hover:underline"
            onClick={() => setShowOpen((s) => !s)}
          >
            {showOpen ? "Hide" : "Show"}
          </button>
        </div>

        {showOpen && (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400">
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.open ?? []).map((i) => (
                  <tr key={i.id} className="border-t border-gray-800">
                    <td className="px-3 py-2">{i.email ?? "(public link)"}</td>
                    <td className="px-3 py-2">{new Date(i.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {i.expires_at ? new Date(i.expires_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2">Open</td>
                    <td className="px-3 py-2 space-x-2">
                      {i.token && (
                        <a
                          href={`/invite/${i.token}`}
                          target="_blank"
                          className="text-blue-400 hover:underline"
                        >
                          Open
                        </a>
                      )}
                      {i.token && (
                        <button
                          onClick={() => navigator.clipboard?.writeText(`${location.origin}/invite/${i.token}`)}
                          className="text-blue-400 hover:underline"
                        >
                          Copy
                        </button>
                      )}
                      <button
                        onClick={() => revoke(i.id, i.token ?? undefined)}
                        className="text-red-400 hover:underline"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
                {(data?.open ?? []).length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-xs text-gray-500" colSpan={5}>
                      No pending invites.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* (Optional) accepted/denied sections could go here with the same guards */}
    </div>
  );
}
