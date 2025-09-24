// src/components/NewLeagueCard.tsx
"use client";

import Link from "next/link";

export default function NewLeagueCard() {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h3 className="mb-2 text-lg font-semibold">Start a new league</h3>
      <p className="mb-4 text-sm text-neutral-400">
        Create a league and invite friends to join.
      </p>
      <Link
        href="/leagues/new"
        className="inline-flex items-center rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
      >
        Create league
      </Link>
    </section>
  );
}
