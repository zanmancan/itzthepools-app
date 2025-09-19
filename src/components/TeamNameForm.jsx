import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function TeamNameForm({ onReady }) {
  const [team, setTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // async IIFE marked as intentionally not awaited
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("team_name")
        .eq("id", user.id)
        .single();
      if (data?.team_name) onReady(data.team_name);
    })();
  }, [onReady]);

  async function save() {
    setError("");
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");
      const { error } = await supabase
        .from("profiles")
        .update({ team_name: team })
        .eq("id", user.id);
      if (error) {
        if (String(error.message).toLowerCase().includes("duplicate")) {
          throw new Error("Team name is taken. Please choose another.");
        }
        throw error;
      }
      onReady(team);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mt-6">
      <div className="h1 mb-3">Choose your Team Name</div>
      <input
        className="input mb-3"
        value={team}
        onChange={(e) => setTeam(e.target.value)}
        placeholder="e.g., Zandy’s Legends"
      />
      <button
        className="btn"
        onClick={() => {
          void save();
        }}
        disabled={saving || !team.trim()}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
