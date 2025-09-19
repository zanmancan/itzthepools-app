"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Props = {
  initial?: string;
  onSaved?: () => void;
  className?: string;
};

export default function TeamNameForm({ initial = "", onSaved, className }: Props) {
  const sb = supabaseClient;
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await sb.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("Not signed in");

      const { error: upErr } = await sb
        .from("profiles")
        .update({ team_name: name.trim() })
        .eq("id", user.id);

      if (upErr) throw upErr;

      onSaved?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save team name";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        void save(); // <-- satisfies no-misused-promises
      }}
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your team name"
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  );
}
