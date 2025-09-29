import { headers } from "next/headers";

// keep this page fully server-side so we can read cookies
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type League = {
  id: string;
  name: string;
  ownerEmail?: string | null;
};

type DebugPayload = {
  sample: { leagues: Array<{ id: string; name: string; ownerEmail?: string | null }> };
};

function readCookie(name: string, cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const hit = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.split("=")[1] ?? "") : null;
}

async function getLeagueDev(leagueId: string): Promise<League | null> {
  // IMPORTANT: absolute URL so it works in SSR during tests
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${base}/api/test/debug`, { cache: "no-store" });
  if (!res.ok) return null;

  const dbg: DebugPayload = await res.json();
  const row = dbg.sample.leagues.find((l) => l.id === leagueId);
  if (!row) return null;
  return { id: row.id, name: row.name, ownerEmail: row.ownerEmail ?? null };
}

export default async function Page(props: { params: { leagueId: string } }) {
  const leagueId = props.params.leagueId;
  const league = await getLeagueDev(leagueId);

  if (!league) {
    // simple not-found UI (matches what you’ve been showing)
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check the URL or go back to the dashboard.
        </p>
      </main>
    );
  }

  // owner check: compare tp_email cookie to league.ownerEmail
  const cookieHeader = headers().get("cookie");
  const email = readCookie("tp_email", cookieHeader);
  const isOwner = !!email && !!league.ownerEmail && email === league.ownerEmail;

  return (
    <main className="p-6 space-y-4" data-testid="league-settings-page">
      <h1 className="text-xl font-semibold" data-testid="league-header">
        {league.name}
      </h1>

      {!isOwner ? (
        // visible marker the tests look for
        <div
          className="rounded border border-red-500/40 bg-red-500/10 p-3"
          data-testid="settings-403"
        >
          You do not have permission to edit this league.
        </div>
      ) : (
        <section className="rounded border p-4">
          <p className="text-sm text-muted-foreground">Settings (owner only) go here.</p>
          {/* keep your real settings form here */}
        </section>
      )}
    </main>
  );
}
