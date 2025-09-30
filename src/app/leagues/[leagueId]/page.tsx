// app/leagues/[leagueId]/page.tsx — League Hub (Dynamic Render with Slug-Aware Fetch + Testid Heading)
import { notFound } from 'next/navigation';

interface League {
  id: string;
  name: string;
  season: string;
  ruleset: string | null;
  is_public: boolean;
  created_at: string;
  created_by: string;
  slug: string;
  role: string;  // owner/member from API
}

export default async function LeagueHub({ params }: { params: { leagueId: string } }) {
  let league: League | null = null;

  try {
    const res = await fetch(`${process.env.BASE_URL || 'http://localhost:3001'}/api/leagues/${params.leagueId}`, {
      cache: 'no-store',  // Dynamic for real-time (picks/standings)
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const { ok, league: l }: { ok: boolean; league: League | null } = await res.json();
    if (!ok || !l) {
      throw new Error('League not found');
    }

    league = l;
  } catch (error) {
    console.error('League fetch error:', error);  // Dev logs
    // Graceful empty state (poll times out as expected—no testid heading)
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">League Not Found</h1>
          <p className="mt-2 text-gray-500">The league you're looking for doesn't exist or you don't have access.</p>
          <a href="/dashboard" className="mt-4 inline-block text-blue-500 underline">
            Back to Dashboard
          </a>
        </div>
      </main>
    );
  }

  if (!league) notFound();  // Next.js 404

  return (
    <main className="mx-auto max-w-4xl p-6">
      {/* Poll Target: Heading with Testid */}
      <h1 data-testid="league-name" className="text-3xl font-bold mb-6">
        {league.name}
      </h1>

      {/* Hub Content: Members, Status, Quick Actions */}
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">League Details</h2>
          <p>Season: {league.season}</p>
          <p>Ruleset: {league.ruleset || 'Standard'}</p>
          <p>Public: {league.is_public ? 'Yes' : 'No'}</p>
          <p>Your Role: {league.role.toUpperCase()}</p>
        </section>

        {/* Future: Members List, Picks, Kebab Actions */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Members</h2>
          <p>Coming soon: List of league members with roles.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Picks & Standings</h2>
          <p>Coming soon: Game picks, scores, and leaderboard.</p>
        </section>

        {/* Owner/Admin Kebab: Settings/Invites */}
        {league.role === 'owner' && (
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-500 text-white rounded">Settings</button>
            <button className="px-4 py-2 bg-green-500 text-white rounded">Invite Members</button>
          </div>
        )}
      </div>
    </main>
  );
}