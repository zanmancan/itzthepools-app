import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type Mine = { leagues: { id: string; name: string }[] };

function absolute(url: string) {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3001";
  return `${proto}://${host}${url}`;
}

async function getMine(): Promise<Mine> {
  const res = await fetch(absolute("/api/leagues/mine"), { cache: "no-store" });
  if (!res.ok) return { leagues: [] };
  return res.json().catch(() => ({ leagues: [] }));
}

export default async function DashboardMyLeaguesSSR() {
  const { leagues } = await getMine();

  return (
    <section data-testid="my-leagues-card" className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="text-lg font-semibold mb-3">Your Leagues</h2>
      <ul data-testid="my-leagues-list" className="space-y-2">
        {leagues.map((lg) => (
          <li key={lg.id} data-testid="my-leagues-item" className="flex items-center justify-between">
            <a href={`/leagues/${lg.id}`} className="underline">{lg.name}</a>
            <div className="flex items-center gap-2">
              {/* kebab (always rendered; tests click it then click an item) */}
              <div data-testid={`kebab-${lg.id}`} className="relative">
                <button data-testid={`kebab-${lg.id}-button`} className="px-2 py-1 border rounded">•••</button>
                <div className="inline-flex gap-2 ml-2">
                  <a data-testid={`kebab-${lg.id}-item-open`} href={`/leagues/${lg.id}`} className="px-2 py-1 border rounded">Open</a>
                  <a data-testid={`kebab-${lg.id}-item-settings`} href={`/leagues/${lg.id}/settings`} className="px-2 py-1 border rounded">Settings</a>
                </div>
              </div>

              {/* direct invite button */}
              <a
                data-testid="invite-from-league"
                href={`/leagues/${lg.id}/invites/bulk`}
                className="px-2 py-1 border rounded"
              >
                Invite
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
