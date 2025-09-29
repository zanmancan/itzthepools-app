// Server component: shows a league by id without indexing arrays by string.
// We use getLeague(id) to avoid "index expression is not of type 'number'" errors.

import { getLeague } from "@/app/api/test/_store";

type PageProps = {
  params: { leagueId: string };
};

export default function LeaguePage({ params }: PageProps) {
  // Safely fetch from the in-memory test store
  const lg = getLeague(params.leagueId);

  return (
    <main className="p-6 space-y-4" data-testid="league-page">
      <h1 className="text-2xl font-semibold">
        {lg ? lg.name : "League Not Found"}
      </h1>

      {/* You can render more league UI below using `lg` if needed */}
    </main>
  );
}
