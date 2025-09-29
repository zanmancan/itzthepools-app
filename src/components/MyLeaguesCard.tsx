"use client";

/**
 * Canonical MyLeaguesCard targeted by E2E.
 * It relies solely on /api/test/leagues/mine for ordering:
 *  - cookie "tp_last_created_league" (if any) is first
 *  - then persisted new leagues
 *  - then seeds
 * No localStorage hacks, no duplicate lists.
 */

import Link from "next/link";
import { useEffect, useState } from "react";

type LeagueRow = { id: string; name: string };

export default function MyLeaguesCard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LeagueRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/test/leagues/mine", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const j = await r.json().catch(() => ({}));
        const list: LeagueRow[] = Array.isArray(j?.leagues) ? j.leagues : [];
        if (alive) setRows(list);
      } catch {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900" data-testid="my-leagues-card">
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <h2 className="text-lg font-semibold">Your Leagues</h2>
        <Link
          href="/leagues/new"
          className="text-xs px-2 py-1 rounded-md border border-neutral-700 hover:bg-neutral-800"
          data-testid="create-league-link"
        >
          Create League
        </Link>
      </header>

      {loading ? (
        <div className="p-4 text-sm text-neutral-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-sm text-neutral-400">No leagues yet. Create or join one to get started.</div>
      ) : (
        <ul className="divide-y divide-neutral-800" data-testid="my-leagues-list">
          {rows.map((r) => (
            <li
              key={r.id}
              className="px-4 py-3 text-sm flex items-center justify-between gap-3"
              data-testid="my-leagues-item"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-neutral-500">
                  <code className="opacity-75">{r.id}</code>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* The spec clicks the FIRST of these and expects it to be the newest league */}
                <Link
                  href={`/leagues/${r.id}/invites/bulk`}
                  className="text-xs px-2 py-1 rounded-md border border-neutral-700 hover:bg-neutral-800"
                  data-testid="invite-from-league"
                >
                  Invite
                </Link>

                {/* Always-visible kebab with stable test ids */}
                <div className="relative" data-testid={`kebab-${r.id}`}>
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-700 px-2 py-1 text-xs"
                    data-testid={`kebab-${r.id}-button`}
                    title="More"
                  >
                    ⋮
                  </button>
                  <div
                    role="menu"
                    className="absolute right-0 z-10 mt-1 min-w-[160px] rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow-xl"
                  >
                    <Link
                      role="menuitem"
                      className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-800"
                      href={`/leagues/${r.id}`}
                      data-testid={`kebab-${r.id}-item-open`}
                    >
                      Open
                    </Link>
                    <Link
                      role="menuitem"
                      className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-800"
                      href={`/leagues/${r.id}/settings`}
                      data-testid={`kebab-${r.id}-item-settings`}
                    >
                      Settings
                    </Link>
                    <Link
                      role="menuitem"
                      className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-800"
                      href={`/leagues/${r.id}/invites/bulk`}
                      data-testid={`kebab-${r.id}-item-invite`}
                    >
                      Invite
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
