"use client";

/**
 * Bulk Invites Guard
 * - Renders a visible 403 for users who are not owner/admin.
 * - When NEXT_PUBLIC_E2E_DEV_SAFETY=1, shows a small dev banner for assertions.
 */
import React from "react";

type Props = {
  role: "owner" | "admin" | "member" | null | undefined;
  children?: React.ReactNode;
};

function DevBanner() {
  if (typeof window === "undefined") return null;
  if (process.env.NEXT_PUBLIC_E2E_DEV_SAFETY !== "1") return null;
  return (
    <div
      data-testid="guard-403-dev-banner"
      className="mt-3 inline-block rounded bg-yellow-900/40 px-2 py-1 text-xs text-yellow-200"
      aria-label="Dev Safety Banner"
    >
      Dev: Guard active (E2E safety)
    </div>
  );
}

export default function Guard({ role, children }: Props) {
  const allowed = role === "owner" || role === "admin";

  if (allowed) {
    // Authorized: render actual page UI
    return <>{children}</>;
  }

  // Forbidden: render visible 403
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-red-700/60 bg-red-950/40 p-6 text-red-100">
      <h2 className="mb-2 text-xl font-semibold">403 — Not authorized</h2>
      <p className="text-sm opacity-90">
        You must be an <strong>owner</strong> or <strong>admin</strong> of this league to access Bulk Invites.
      </p>

      <div
        data-testid="guard-403"
        className="mt-4 rounded-md border border-red-700/70 bg-red-950/60 px-3 py-2 text-sm"
        aria-live="polite"
      >
        Access blocked for this account.
      </div>

      <DevBanner />
    </div>
  );
}
