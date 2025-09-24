// src/app/leagues/[leagueId]/page.tsx
"use client";

import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function LeaguePage({ params }: { params: { leagueId: string } }) {
  const { leagueId } = params;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1
        data-testid="league-header"
        id="league-header"
        className="text-2xl font-semibold"
      >
        League
      </h1>

      <div className="text-sm text-gray-500">ID: {leagueId}</div>

      <div className="rounded border p-4">
        <p>Welcome! Minimal placeholder so E2E can assert the header.</p>
        <p className="mt-2">
          <Link className="underline" href={`/leagues/${leagueId}/invites/bulk`}>
            Bulk invites
          </Link>
          {" · "}
          <Link className="underline" href="/dashboard">
            Back to Dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
