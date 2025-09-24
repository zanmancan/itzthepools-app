// src/app/leagues/new/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

function validateName(n: string): string | null {
  const s = n.trim();
  if (s.length < 3) return "League name must be at least 3 characters.";
  if (s.length > 40) return "League name must be 40 characters or fewer.";
  if (!/^[A-Za-z0-9 _-]+$/.test(s))
    return "Only letters, numbers, spaces, dashes and underscores are allowed.";
  return null;
}

export default function NewLeaguePage() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function onCreate() {
    setToast(null);
    const err = validateName(name);
    if (err) {
      // ✅ Client-side validation so the “bad name” test never hits the API
      setToast(err);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/leagues/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setToast(json?.message ?? `Failed to create league (HTTP ${res.status})`);
        setBusy(false);
        return;
      }
      window.location.href = `/leagues/${json.leagueId}`;
    } catch {
      setToast("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create League</h1>
      <p className="text-sm text-gray-600">
        Enter a name for your league. You’ll be able to invite players after it’s
        created.
      </p>

      <label className="block space-y-1">
        <span className="text-sm">League name</span>
        <input
          data-testid="league-name-input"
          name="leagueName"
          className="w-full rounded border px-3 py-2"
          placeholder="e.g. Zandy Family Bracket"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <button
        data-testid="create-league"
        className="rounded px-4 py-2 border"
        onClick={() => void onCreate()}
        disabled={busy || !name.trim()}
      >
        {busy ? "Creating…" : "Create league"}
      </button>

      {toast && (
        <div
          data-testid="toast"
          role="status"
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {toast}
        </div>
      )}

      <p className="text-sm">
        <Link className="underline" href="/dashboard">
          Back to Dashboard
        </Link>
      </p>
    </main>
  );
}
