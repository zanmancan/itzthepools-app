// src/app/dashboard/page.tsx
import React from "react";

// Import the in-memory dev store ONLY in dev/test mode.
// This file is safe: when the flag is off, we won't touch the store.
let listDevLeagues: (() => { id: string; name: string; createdAt: string }[]) | null = null;
if (process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const devStore = require("@/lib/devStore"); // dynamic require to avoid bundling in prod paths
  listDevLeagues = devStore.listLeagues as typeof listDevLeagues;
}

type DevLeague = {
  id: string;
  name: string;
  createdAt: string;
};

async function getLeagues(): Promise<DevLeague[]> {
  // In dev/e2e mode, read from the shared in-memory store directly.
  if (process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1" && typeof listDevLeagues === "function") {
    return listDevLeagues() as DevLeague[];
  }
  // Otherwise, your real implementation (left as demo shell for now)
  return [];
}

export const dynamic = "force-dynamic"; // keep dev rendering flexible

export default async function DashboardPage() {
  const leagues = await getLeagues();
  const hasLeagues = leagues.length > 0;

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <div className="inline-block mb-4">
        <span className="px-2 py-1 text-xs rounded bg-yellow-800/50 border border-yellow-700">DEV</span>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6">
        <h2 className="text-xl font-semibold mb-2">Your Leagues</h2>
        {!hasLeagues ? (
          <p className="text-white/60 text-sm">
            (Demo shell — real league data coming later)
          </p>
        ) : (
          <ul className="space-y-3">
            {leagues.map((lg) => (
              <li
                key={lg.id}
                data-testid="league-row"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col">
                  <a
                    href={`/leagues/${lg.id}`}
                    className="font-medium hover:underline"
                  >
                    {lg.name}
                  </a>
                  <span className="text-xs text-white/50">{lg.id}</span>
                </div>

                {/* Kebab menu trigger (dev-only; our test clicks this) */}
                <button
                  type="button"
                  data-testid="league-row-kebab"
                  aria-label="More options"
                  className="rounded-full px-3 py-2 border border-white/10 hover:bg-white/10"
                >
                  ⋮
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Minimal menu popover when a kebab is clicked (dev only) */}
      {process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1" ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('click', (e) => {
                const btn = (e.target)?.closest?.('[data-testid="league-row-kebab"]');
                const existing = document.querySelector('[data-testid="dev-kebab-menu"]');
                if (!btn) { existing?.remove(); return; }
                existing?.remove();
                const li = btn.closest('[data-testid="league-row"]');
                const idEl = li?.querySelector('span.text-xs');
                const id = (idEl?.textContent || '').trim();
                const menu = document.createElement('div');
                menu.setAttribute('data-testid','dev-kebab-menu');
                menu.setAttribute('role','menu');
                const r = btn.getBoundingClientRect();
                Object.assign(menu.style, {
                  position: 'absolute',
                  left: r.left + 'px',
                  top: (r.bottom + 6) + 'px',
                  background: 'rgba(33,33,33,0.98)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '8px 6px',
                  zIndex: 9999
                });
                function item(label, href) {
                  const a = document.createElement('a');
                  a.setAttribute('role','menuitem');
                  a.href = href;
                  a.textContent = label;
                  Object.assign(a.style, {
                    display: 'block',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    color: 'white',
                    textDecoration: 'none'
                  });
                  a.addEventListener('mouseenter', () => a.style.background = 'rgba(255,255,255,0.08)');
                  a.addEventListener('mouseleave', () => a.style.background = 'transparent');
                  menu.appendChild(a);
                }
                item('Open', '/leagues/' + id);
                item('Invite', '/leagues/' + id + '/invites');
                item('Settings', '/leagues/' + id + '/settings');
                document.body.appendChild(menu);
              });
            `,
          }}
        />
      ) : null}
    </main>
  );
}
