"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "./Toast";

type Props = {
  leagueId: string;
  onUpdated?: () => void;
};

export default function LeagueTeamNameForm({ leagueId, onUpdated }: Props) {
  const { addToast } = useToast();

  const [uid, setUid] = useState<string | null>(null);

  const [currentName, setCurrentName] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  // live availability
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Load session user + current team name
  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      const user = ures?.user ?? null;
      setUid(user?.id ?? null);
      if (!user) return;

      const { data, error } = await supabase
        .from("league_members")
        .select("team_name")
        .eq("league_id", leagueId)
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setCurrentName(data.team_name ?? null);
        setValue(data.team_name ?? "");
      } else {
        setCurrentName(null);
        setValue("");
      }
    })();
  }, [leagueId]);

  const trimmed = value.trim();

  const invalid =
    trimmed.length < 3 ||
    trimmed.length > 24 ||
    !/^[A-Za-z0-9 _.-]+$/.test(trimmed);

  // Are we currently showing the user's saved name?
  const matchesCurrent =
    !!currentName &&
    trimmed.length > 0 &&
    trimmed.toLowerCase() === currentName.toLowerCase();

  // Debounced availability check (only if value differs from current)
  useEffect(() => {
    setAvailable(null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (!uid || invalid || trimmed.length === 0 || matchesCurrent) return;

    setChecking(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("is_team_name_available", {
          p_league_id: leagueId,
          p_name: trimmed,
          p_user: uid, // exclude my own membership
        });
        setAvailable(error ? null : Boolean(data));
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 450) as unknown as number;

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [trimmed, invalid, matchesCurrent, leagueId, uid]);

  // Save
  async function save() {
    if (!uid) return;

    if (invalid) {
      addToast(
        "Team name must be 3–24 chars and only letters, numbers, spaces, _ . or -.",
        "error"
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("league_members")
        .upsert(
          {
            league_id: leagueId,
            user_id: uid,
            role: "member",
            team_name: trimmed,
          },
          { onConflict: "league_id,user_id" }
        );

      if (error) throw error;

      setCurrentName(trimmed);
      addToast("Team name saved!", "success");
      onUpdated?.();
    } catch (e: any) {
      addToast(e?.message ?? "Failed to save team name", "error");
    } finally {
      setSaving(false);
    }
  }

  // Helper text logic
  const helper = useMemo(() => {
    if (invalid) {
      return (
        <span className="text-red-400">
          Team name must be 3–24 chars; letters, numbers, spaces, _ . or -.
        </span>
      );
    }

    // If the input equals the saved name, only show the “current name” line.
    if (matchesCurrent && currentName) {
      return (
        <span className="text-emerald-400">
          <span className="font-medium">{currentName}</span> is your current team name for this league.
        </span>
      );
    }

    // Otherwise show availability state
    if (checking) return <span className="opacity-70">Checking…</span>;
    if (available === false)
      return <span className="text-red-400">That name is already taken in this league.</span>;
    if (available === true)
      return <span className="text-emerald-400">Available in this league.</span>;

    // Neutral hint while typing
    return <span className="opacity-70">You can change this anytime.</span>;
  }, [invalid, checking, available, matchesCurrent, currentName]);

  return (
    <div className="card">
      <div className="mb-1 font-medium">Team Name (this league)</div>

      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="e.g., Zandy Family Bracket"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={invalid}
        />
        <button className="btn" onClick={save} disabled={saving || invalid}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="text-sm mt-2">{helper}</div>
    </div>
  );
}
