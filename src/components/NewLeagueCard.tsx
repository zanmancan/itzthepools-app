// src/components/NewLeagueCard.tsx
"use client";

import Link from "next/link";

export default function NewLeagueCard() {
  // Keep this component as a simple CTA that sends users to the proper "new league" page
  // where you already have a full TSX form (e.g., LeagueSettingsForm).
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h3 className="mb-2 text-lg font-semibold">Start a new league</h3>
      <p className="mb-4 text-sm text-neutral-400">
        Create a league and invite friends to join.
      </p>
      <Link
        href="/league/new"
        className="inline-flex items-center rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
      >
        Create league
      </Link>
    </section>
  );
}
