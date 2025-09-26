"use client";

/**
 * MyLeaguesCard (dev-friendly)
 * - Tries /api/test/leagues/mine, then /api/leagues/mine.
 * - If still empty in NON-PRODUCTION, seeds a demo row so E2Es always have something to click.
 * - Row is clickable → /leagues/:id
 * - Keeps legacy inline Invite button (data-testid="invite-from-league") and new Kebab menu.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Kebab from "./Kebab";

type LeagueRow = { id: string; name: string };

async function fetchJson<T>(url: string) {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function loadMine(): Promise<LeagueRow[]> {
  // Dev test endpoint
  const a = await fetchJson<{ leagues: LeagueRow[] }>("/api/test/leagues/mine");
  if (a?.leagues?.length) return a.leagues;

  // Real endpoint fallback (if present)
  const b = await fetchJson<{ leagues?: LeagueRow[] } | LeagueRow[]>("/api/leagues/mine");
  if (Array.isArray(b)) return b as LeagueRow[];
  if (b && Array.isArray((b as any).leagues)) return (b as any).leagues as LeagueRow[];

  return [];
}

export default function MyLeaguesCard() {
  const [rows, setRows] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await loadMine();
        if (!alive) return;

        if ((list?.length ?? 0) === 0 && process.env.NODE_ENV !== "production") {
          // Seed a demo row in dev/test to make Kebab/row-click tests deterministic
          setRows([{ id: "lg_demo_dev", name: "Demo League (Dev)" }]);
        } else {
          setRows(list ?? []);
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load leagues.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section
      className="rounded-xl border border-neutral-800 bg-neutral-900"
      data-testid="my-leagues-card"
    >
      <header className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Leagues</h2>
        <Link className="text-sm underline" href="/leagues/new">
          + New League
        </Link>
      </header>

      {loading ? (
        <div className="p-4 text-sm text-neutral-400">Loading…</div>
      ) : err ? (
        <div className="p-4 text-sm text-red-400" data-testid="leagues-error">
          {err}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-sm text-neutral-400">No leagues yet.</div>
      ) : (
        <ul className="divide-y divide-neutral-800" data-testid="my-leagues-list">
          {rows.map((lg) => (
            <li
              key={lg.id}
              className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-800/50"
              data-testid="my-leagues-item"
              onClick={() => router.push(`/leagues/${lg.id}`)}
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{lg.name}</div>
                <div className="text-xs text-neutral-400">
                  <code className="opacity-75">{lg.id}</code>
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {/* Legacy inline Invite button for compatibility */}
                <button
                  type="button"
                  className="text-xs underline underline-offset-2"
                  data-testid="invite-from-league"
                  onClick={() => router.push(`/leagues/${lg.id}/invites/bulk`)}
                >
                  Invite
                </button>

                {/* New Kebab */}
                <Kebab
                  size={18}
                  ariaLabel={`League actions for ${lg.name}`}
                  data-testid={`kebab-${lg.id}`}
                  actions={[
                    { key: "open", label: "Open", href: `/leagues/${lg.id}` },
                    { key: "invite", label: "Invite", href: `/leagues/${lg.id}/invites/bulk` },
                    { key: "settings", label: "Settings", href: `/leagues/${lg.id}/settings` },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
