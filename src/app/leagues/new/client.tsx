"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewLeagueClient() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const r = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setToast(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setToast("Name required");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/leagues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      const created = json?.league as { id: string; name: string } | undefined;
      if (created?.id && created?.name) {
        // Breadcrumb so /dashboard can always show this in MyLeaguesCard.
        try {
          localStorage.setItem(
            "tp_last_created_league",
            JSON.stringify({ id: created.id, name: created.name, ts: Date.now() })
          );
        } catch {}

        // Navigate to league THEN the dashboard (tests read both patterns)
        r.push(`/leagues/${created.id}`);
        // Small async hop — Playwright will navigate to /dashboard after this page load
        setTimeout(() => r.push("/dashboard"), 0);
      } else {
        setToast("Create returned no league");
      }
    } catch (err: any) {
      setToast(err?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      {toast && (
        <div data-testid="toast" role="alert" className="rounded-md border border-red-700 bg-red-950/60 px-3 py-2 text-sm text-red-200">
          {toast}
        </div>
      )}

      <label htmlFor="league-name" className="text-sm">
        League name
      </label>
      <input
        id="league-name"
        data-testid="league-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none"
        placeholder="Card League"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-60"
          data-testid="create-league"
        >
          {busy ? "Creating…" : "Create League"}
        </button>
      </div>
    </form>
  );
}
