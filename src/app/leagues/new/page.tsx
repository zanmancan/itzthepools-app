"use client";

/**
 * Create League page used by E2E tests.
 *
 * Behaviour:
 *  - Validates name length (≥ 3 trimmed chars) and shows a toast on failure.
 *  - POSTs to /api/leagues and expects a response shaped like:
 *      { ok: true, league: { id: string, name: string } }
 *  - Navigates to /leagues/:id using the ID from the response.
 *    (We also accept a couple of legacy shapes just in case.)
 *
 * Test hooks:
 *  - [data-testid="league-name-input"]
 *  - [data-testid="create-league"]
 *  - [data-testid="toast"]
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

function normalizeId(json: any): string | null {
  // Prefer the canonical shape: { league: { id } }
  const id =
    json?.league?.id ??
    json?.id ??                // legacy
    json?.leagueId ??          // very old
    json?.slug ?? null;        // very old
  return typeof id === "string" && id.length > 0 ? id : null;
}

export default function NewLeaguePage() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setToast(null);

    const trimmed = name.trim();
    if (trimmed.length < 3) {
      // ⚠️ The spec asserts on the wording “at least 3 characters”
      setToast("Name must be at least 3 characters");
      return;
    }

    try {
      setSubmitting(true);

      // Always hit the dev stubbed REST endpoint
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      const id = normalizeId(json);
      if (!id) {
        // Robust error so failures are obvious in UI & Playwright trace
        throw new Error("Create league responded without an id");
      }

      router.push(`/leagues/${encodeURIComponent(id)}`);
    } catch (err: any) {
      console.error("[/leagues/new] create failed:", err);
      setToast(err?.message || "Something went wrong creating the league");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="p-8 max-w-xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Create a League</h1>
        <p className="text-sm opacity-70">
          Give your league a name and we&apos;ll take you to its page.
        </p>
      </header>

      {toast && (
        <div
          role="alert"
          data-testid="toast"
          className="rounded-lg border border-red-700/60 bg-red-900/30 p-3 text-sm"
        >
          {toast}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm">League name</span>
          <input
            data-testid="league-name-input"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="e.g., My League"
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-700"
            autoFocus
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          data-testid="create-league"
          className="rounded-md border border-sky-700 bg-sky-800 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-800/80 disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create"}
        </button>
      </form>
    </main>
  );
}
