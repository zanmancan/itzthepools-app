// src/app/dashboard/page.tsx
import React from "react";
import DashboardInvitesPanel from "@/components/DashboardInvitesPanel";

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

export default async function DashboardPage() {
  const leagues: DevLeague[] = listDevLeagues ? listDevLeagues()! : [];
  const hasLeagues = leagues.length > 0;

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

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
                  className="rounded-lg border border-white/15 px-2 py-1 text-sm hover:bg-white/10"
                >
                  ⋮
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* DEV-only kebab popover behavior */}
      {process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1" ? (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
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
                  item('Invite', '/leagues/' + id + '/invites/bulk');
                  item('Settings', '/leagues/' + id + '/settings');
                  document.body.appendChild(menu);
                });
              })();`,
          }}
        />
      ) : null}

      {/* NEW: Recent Invites panel (dev/e2e only) so #9 can revoke from dashboard */}
      {process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1" ? (
        <section className="mt-6">
          <DashboardInvitesPanel />
        </section>
      ) : null}
    </main>
  );
}
