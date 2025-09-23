// src/app/leagues/[leagueId]/page.tsx
/**
 * Minimal E2E target page.
 * - Exists only so tests can assert `[data-testid="league-header"]`
 * - Does NOT require Supabase auth (keeps tests simple right now)
 * - When your real league page is ready, either:
 *     A) render the real component here, or
 *     B) redirect this route to `/league/[leagueId]`
 */
export default function LeaguePage({ params }: { params: { leagueId: string } }) {
  return (
    <main className="p-6">
      <h1 data-testid="league-header" className="text-2xl font-semibold">
        League {params.leagueId}
      </h1>
      <p className="opacity-70">Temporary test target. Replace with the real league UI.</p>
    </main>
  );
}
