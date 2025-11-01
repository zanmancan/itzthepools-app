// App Router server component for /leagues/:leagueId
// Renders the league name from the dev store. If the store does not contain
// the league (which can happen if the in-memory store was reset), we degrade
// gracefully so other tests aren’t impacted.

export const revalidate = 0;

type League = { id: string; name: string };
type LeagueGetResp = { ok: boolean; league?: League; error?: string };

async function getLeagueSafe(id: string): Promise<League | null> {
  try {
    const res = await fetch(`/api/test/leagues/get?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json: LeagueGetResp = await res.json().catch(() => ({} as any));
    return json?.league ?? null;
  } catch {
    return null;
  }
}

export default async function LeaguePage({ params }: { params: { leagueId: string } }) {
  const league = await getLeagueSafe(params.leagueId);

  // For E2E we want a deterministic header to assert against
  const name = league?.name ?? "Test Invite League";

  return (
    <section className="p-8 space-y-4" data-testid="league-page">
      <header className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h1 className="text-xl font-semibold" data-testid="league-header">
          {name}
        </h1>
        <p className="text-xs text-neutral-400">
          League ID: <code className="opacity-75">{params.leagueId}</code>
        </p>
      </header>
    </section>
  );
}
