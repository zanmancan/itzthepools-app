"use client";

/**
 * Bulk Invites — Minimal testable shell (E2E-aligned)
 * - Reads leagueId from useParams()
 * - POSTs to /api/test/invites/bulk
 * - IMPORTANT: does NOT auto-navigate. The test expects to see list items on THIS page.
 * - After assertions, the test itself will go to /dashboard and look for invite rows.
 */

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";

function splitEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Client() {
  const params = useParams();
  const leagueId = String((params as any)?.leagueId ?? "");

  const [input, setInput] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const unique = useMemo(() => Array.from(new Set(splitEmails(input))), [input]);

  async function onSend() {
    setError(null);
    setSent(false);

    if (!unique.length) {
      setResults([]);
      return;
    }
    const invalids = unique.filter((e) => !EMAIL_RE.test(e));
    if (invalids.length) {
      setResults([]);
      // test looks for /invalid emails/i
      setError(`Invalid emails: ${invalids.join(", ")}`);
      return;
    }

    // Dev API: create invites server-side so Dashboard can read them later
    try {
      const res = await fetch("/api/test/invites/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ leagueId, emails: unique }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || `Failed to send invites (${res.status})`);
        setResults([]);
        return;
      }
      // Show the list on THIS page (the test counts these next)
      setResults(unique);
      setSent(true);
    } catch (e: any) {
      setError(e?.message || "Network error");
      setResults([]);
    }
  }

  return (
    <div className="space-y-4" data-testid="bulk-invites-page">
      <h1 className="text-xl font-semibold">Bulk Invites</h1>
      <p className="text-sm text-neutral-500">
        League: <span className="font-mono">{leagueId}</span>
      </p>

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
        <label className="block text-sm">
          Paste emails (one per line, or comma-separated)
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent p-2 text-sm"
          placeholder="a@example.com&#10;b@example.com"
          data-testid="bulk-emails"
        />

        <div className="flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {unique.length} unique email{unique.length === 1 ? "" : "s"}
          </div>
          <button
            type="button"
            onClick={onSend}
            className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            data-testid="bulk-send"
          >
            Send Invites
          </button>
        </div>

        {error && (
          <div
            className="mt-2 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm"
            data-testid="toast"
          >
            {error}
          </div>
        )}

        {!!results.length && (
          // Test expects [data-testid="bulk-result"] li to be count(3)
          <ul className="mt-2 space-y-1" data-testid="bulk-result">
            {results.map((e) => (
              <li key={e} className="text-sm text-neutral-200">
                {e}
              </li>
            ))}
          </ul>
        )}

        {sent && !error && (
          <div className="text-xs text-neutral-400">
            Invites created. You can return to your dashboard to see them listed.
          </div>
        )}
      </div>
    </div>
  );
}
