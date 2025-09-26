// src/app/leagues/[leagueId]/page.tsx
/**
 * League Home (Open from Kebab)
 * - SSR: loads league from the dev in-memory store
 * - Renders a minimal header with name + id
 * - 404 if the league id doesn't exist
 */

import { notFound } from "next/navigation";
import { getLeague } from "@/app/api/test/_store";

type PageProps = { params: { leagueId: string } };

export const dynamic = "force-dynamic";

export default async function LeaguePage({ params }: PageProps) {
  const leagueId = params?.leagueId;
  const lg = leagueId ? getLeague(leagueId) : null;
  if (!lg) return notFound();

  return (
    <section className="space-y-4" data-testid="league-page">
      <header className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h1 className="text-xl font-semibold" data-testid="league-header">
          {lg.name}
        </h1>
        <p className="text-xs text-neutral-400">
          League ID: <code className="opacity-75">{lg.id}</code>
        </p>
      </header>

      {/* Placeholder body — we can add tabs/standings later */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <p className="text-sm text-neutral-300">
          Welcome to the league home. Settings and bulk invites live under the Kebab.
        </p>
      </div>
    </section>
  );
}
