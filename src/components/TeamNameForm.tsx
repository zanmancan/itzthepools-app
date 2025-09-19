// components/TeamNameForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-client"; // <-- use your existing client

/**
 * UI for setting/changing a user's Team Name.
 * - Validates locally with the same rules as the DB CHECK constraint
 * - Live availability check (debounced) via RPC team_name_available(text)
 * - Save calls RPC set_team_name(text) and refreshes local state
 */

const TEAM_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 _-]*[A-Za-z0-9]$/;
const MIN = 3;
const MAX = 24;

function normalize(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; msg: string }
  | { kind: "error"; msg: string };

export default function TeamNameForm(props: { initialName?: string }) {
  const [input, setInput] = useState(props.initialName ?? "");
  const [serverName, setServerName] = useState(props.initialName ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleaned = useMemo(() => normalize(input), [input]);

  const localValidationError = useMemo(() => {
    if (!cleaned) return "Team name cannot be empty.";
    if (cleaned.length < MIN || cleaned.length > MAX)
      return `Use ${MIN}-${MAX} characters.`;
    if (!TEAM_NAME_REGEX.test(cleaned))
      return "Only letters, numbers, spaces, _ or -. No leading/trailing spaces.";
    return null;
  }, [cleaned]);

  useEffect(() => {
    if (!cleaned || localValidationError) {
      setStatus({ kind: "idle" });
      return;
    }
    if (cleaned.toLowerCase() === (serverName || "").toLowerCase()) {
      setStatus({ kind: "ok", msg: "This is your current team name." });
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    setStatus({ kind: "checking" });
    debounce.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("team_name_available", {
          candidate: cleaned,
        });
        if (error) throw error;
        setStatus(
          data === true
            ? { kind: "ok", msg: "Available ✓" }
            : { kind: "error", msg: "Taken ✗" }
        );
      } catch (e: any) {
        setStatus({ kind: "error", msg: e.message ?? "Failed to check." });
      }
    }, 450);
  }, [cleaned, localValidationError, serverName]);

  async function handleSave() {
    const name = cleaned;
    if (localValidationError) {
      setStatus({ kind: "error", msg: localValidationError });
      return;
    }
    setSaving(true);
    setStatus({ kind: "checking" });
    try {
      const { data, error } = await supabase.rpc("set_team_name", {
        new_name: name,
      });
      if (error) throw error;
      setServerName(data?.team_name ?? name);
      setInput(data?.team_name ?? name);
      setStatus({ kind: "ok", msg: "Saved!" });
    } catch (e: any) {
      const msg =
        e?.message ??
        (typeof e === "string" ? e : "Could not save team name. Try again.");
      setStatus({ kind: "error", msg });
    } finally {
      setSaving(false);
    }
  }

  function hintColor() {
    switch (status.kind) {
      case "checking":
        return "text-yellow-400";
      case "ok":
        return "text-green-400";
      case "error":
        return "text-red-400";
      default:
        return "text-neutral-400";
    }
  }

  return (
    <div className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 p-5 shadow">
      <div className="mb-3 text-lg font-semibold">Team Name</div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., Zandy Family Bracket"
          className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
          maxLength={MAX}
        />
        <button
          onClick={handleSave}
          disabled={
            saving ||
            !!localValidationError ||
            (status.kind === "error" && status.msg === "Taken ✗")
          }
          className="rounded-xl bg-sky-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          title="Save team name"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className={`mt-2 text-sm ${hintColor()}`}>
        {localValidationError
          ? localValidationError
          : status.kind === "idle"
          ? "3–24 chars, letters/numbers/spaces/_/-"
          : status.kind === "checking"
          ? "Checking..."
          : status.msg}
      </div>

      {serverName && (
        <div className="mt-3 text-xs text-neutral-400">
          Current: <span className="text-neutral-200">{serverName}</span>
        </div>
      )}
    </div>
  );
}
