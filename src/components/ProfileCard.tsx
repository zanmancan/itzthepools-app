"use client";

import React, { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Profile = {
  team_name?: string | null;
  email?: string | null;
};

type Props = {
  profile?: Profile;
  loading?: boolean;
  onSaved?: () => void;
};

export default function ProfileCard({ profile, loading, onSaved }: Props) {
  const sb = supabaseClient;

  const [team, setTeam] = useState<string>(profile?.team_name ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function saveTeam() {
    setMsg("");
    try {
      setSaving(true);

      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const { error } = await sb
        .from("profiles")
        .update({ team_name: team })
        .eq("id", user.id);

      if (error) throw error;

      setMsg("Saved.");
      onSaved?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(ev: React.ChangeEvent<HTMLInputElement>) {
    setMsg("");
    const file = ev.target.files?.[0];
    if (!file) return;

    try {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}.${ext}`;

      const { error: upErr } = await sb.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);

      const { error: uerr } = await sb
        .from("profiles")
        .update({ avatar_url: pub.publicUrl })
        .eq("id", user.id);
      if (uerr) throw uerr;

      setMsg("Avatar updated.");
      onSaved?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function sendReset() {
    setMsg("");
    try {
      const email = profile?.email ?? "";
      if (!email) throw new Error("Missing email.");

      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/recover`,
      });
      if (error) throw error;

      setMsg("Password reset email sent.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="card">
      <div className="h1 mb-3">Profile</div>

      <label className="block text-sm mb-1">Team name</label>
      <div className="flex gap-2 mb-3">
        <input
          className="input flex-1"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        />
        <button
          className="btn"
          onClick={() => {
            void saveTeam();
          }}
          disabled={saving || !team.trim()}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <label className="block text-sm mb-1">Avatar</label>
      <input
        type="file"
        accept="image/*"
        onChange={(ev) => {
          void uploadAvatar(ev);
        }}
        className="mb-3"
      />

      <div className="mt-4">
        <button
          className="btn"
          onClick={() => {
            void sendReset();
          }}
        >
          Send password reset
        </button>
      </div>

      {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}
    </div>
  );
}
