// Server component: shows a league by id without array indexing by string.
// Uses the in-memory test store helper for a safe lookup.

import { getLeague } from "@/app/api/test/_store";

type PageProps = {
  params: { leagueId: string };
};

export default function LeaguePage({ params }: PageProps) {
  const league = getLeague(params.leagueId);

  return (
    <main className="p-6 space-y-4" data-testid="league-page">
      <h1 className="text-2xl font-semibold">
        {league ? league.name : "League Not Found"}
      </h1>

      {/* Add more league UI here as needed */}
    </main>
  );
}
