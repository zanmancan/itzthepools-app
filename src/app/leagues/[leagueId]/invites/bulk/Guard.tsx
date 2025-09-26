"use client";

/**
 * Guard — 403 Not Authorized banner for bulk invites
 * - Minimal, testable visible indicator
 * - Shows a dev banner when NEXT_PUBLIC_E2E_DEV_SAFETY=1
 */

import React from "react";

export default function Guard({ leagueId }: { leagueId: string }) {
  const dev = process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1";

  return (
    <div
      className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4"
      data-testid="guard-403"
      aria-live="polite"
    >
      <div className="text-red-700 dark:text-red-300 font-semibold mb-1">
        403 — Not Authorized
      </div>
      <div className="text-sm text-red-800/80 dark:text-red-300/80">
        You do not have permission to manage bulk invites for league{" "}
        <span className="font-mono">{leagueId}</span>.
      </div>
      <div className="mt-3">
        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
          Return to Dashboard
        </a>
      </div>
      {dev && (
        <div
          className="mt-3 text-[11px] px-2 py-1 inline-flex rounded-md border border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700"
          data-testid="guard-403-dev-banner"
        >
          Dev mode: visible indication (NEXT_PUBLIC_E2E_DEV_SAFETY=1)
        </div>
      )}
    </div>
  );
}
