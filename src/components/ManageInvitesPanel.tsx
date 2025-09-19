"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

type InviteRow = {
  id: string;
  token: string;
  email: string | null;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
};

export default function ManageInvitesPanel({ leagueId }: { leagueId: string }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/invites`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setRows(json.invites ?? []);
    } catch (e: any) {
      addToast(e?.message ?? "Failed to load invites", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [leagueId]);

  async function copyLink(token: string) {
    const joinUrl = `${location.origin}/join/${token}`;
    await navigator.clipboard.writeText(joinUrl);
    addToast("Copied invite link", "success");
  }

  async function revoke(id: string) {
    try {
      const res = await fetch(`/api/invites/id/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      addToast("Invite revoked", "success");
      load();
    } catch (e: any) {
      addToast(e?.message ?? "Failed to revoke invite", "error");
    }
  }

  return (
    <div className="card mt-3">
      <div className="font-medium mb-2">Active Invites</div>
      {loading ? (
        <div className="opacity-70">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="opacity-70">No invites yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="opacity-70 text-left">
              <tr>
                <th className="py-2">Type</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = r.revoked_at ? "Revoked"
                  : r.accepted_at ? "Used"
                  : (r.expires_at && new Date(r.expires_at) < new Date()) ? "Expired"
                  : "Open";

                return (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="py-2">{r.email ? `Email: ${r.email}` : "Public link"}</td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    <td>{r.expires_at ? new Date(r.expires_at).toLocaleString() : "—"}</td>
                    <td>{status}</td>
                    <td className="text-right">
                      <div className="flex gap-2 justify-end">
                        <button className="btn" onClick={() => copyLink(r.token)} disabled={!!r.revoked_at}>
                          Copy
                        </button>
                        <button className="btn" onClick={() => revoke(r.id)} disabled={!!r.revoked_at || !!r.accepted_at}>
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
