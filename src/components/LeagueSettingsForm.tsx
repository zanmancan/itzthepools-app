"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

export default function LeagueSettingsForm({ leagueId }: { leagueId: string }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [maxMembers, setMaxMembers] = useState(50);
  const [defaultInviteDays, setDefaultInviteDays] = useState(7);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Fetch latest league row (you can embed in your leagues query if you prefer)
      const res = await fetch(`/api/leagues/${leagueId}/invites`, { method: "GET" });
      // We don't actually get settings here; assume they are passed down or fetch via /me or /leagues list you already have.
      // If your leagues list includes these fields, pass them in via props instead.
      setLoading(false);
    })();
  }, [leagueId]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic, maxMembers, defaultInviteExpiresDays: defaultInviteDays })
      });
      if (!res.ok) throw new Error(await res.text());
      addToast("Settings saved", "success");
    } catch (e: any) {
      addToast(e?.message ?? "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="opacity-70">Loading settings…</div>;

  return (
    <div className="card mt-3">
      <div className="font-medium mb-2">League Settings</div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          <span>Public league</span>
        </label>
        <label className="block">
          <div className="mb-1 opacity-70">Max players</div>
          <input className="input" type="number" min={2} value={maxMembers}
                 onChange={(e) => setMaxMembers(Number(e.target.value) || 2)} />
        </label>
      </div>
      <label className="block mt-3">
        <div className="mb-1 opacity-70">Default invite expiration (days)</div>
        <input className="input" type="number" min={0} value={defaultInviteDays}
               onChange={(e) => setDefaultInviteDays(Math.max(0, Number(e.target.value) || 0))} />
      </label>
      <button className="btn mt-3" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}
