// src/components/ActiveInvites.tsx
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

type Invite = {
  id: string;
  token: string;
  email: string | null;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  use_count: number;
  max_uses: number | null;
};

export default function ActiveInvites({
  leagueId,
}: {
  leagueId: string;
}) {
  const { addToast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invites?leagueId=${encodeURIComponent(leagueId)}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setInvites(json.invites ?? []);
    } catch (e: any) {
      addToast(e?.message ?? "Failed to load invites", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  async function revoke(id: string) {
    try {
      const res = await fetch(`/api/invites/id/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      addToast("Invite revoked.", "success");
      setInvites((list) => list.filter((i) => i.id !== id));
    } catch (e: any) {
      addToast(e?.message ?? "Failed to revoke invite", "error");
    }
  }

  if (loading) return <p className="opacity-70 mt-2">Loading invites…</p>;
  if (!invites.length) return <p className="opacity-70 mt-2">No active invites.</p>;

  return (
    <div className="mt-3">
      <div className="opacity-75 mb-1">Active Invites</div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="opacity-70 text-left">
            <tr>
              <th className="pr-3 py-1">Created</th>
              <th className="pr-3 py-1">For</th>
              <th className="pr-3 py-1">Uses</th>
              <th className="pr-3 py-1">Expires</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {invites.map((i) => {
              const uses =
                i.max_uses && i.max_uses > 0 ? `${i.use_count}/${i.max_uses}` : `${i.use_count}/∞`;
              const created = new Date(i.created_at).toLocaleString();
              const expires = i.expires_at ? new Date(i.expires_at).toLocaleString() : "—";
              return (
                <tr key={i.id} className="border-t border-white/10">
                  <td className="pr-3 py-1">{created}</td>
                  <td className="pr-3 py-1">{i.email ?? "Any email (public link)"}</td>
                  <td className="pr-3 py-1">{uses}</td>
                  <td className="pr-3 py-1">{expires}</td>
                  <td className="py-1">
                    <button className="btn" onClick={() => revoke(i.id)}>
                      Revoke
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
