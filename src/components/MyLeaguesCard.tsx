// src/components/MyLeaguesCard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LeagueRow = { id: string; name: string };

export default function MyLeaguesCard() {
  const [rows, setRows] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/leagues/mine", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const j = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok) throw new Error(j?.message ?? `HTTP ${res.status}`);
        setRows(Array.isArray(j?.leagues) ? j.leagues : []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? "Failed to load leagues.");
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      data-testid="my-leagues-card"
      className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">My leagues</h3>
        <Link
          href="/leagues/new"
          className="rounded-lg border border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-800"
          data-testid="new-league-link"
        >
          New league
        </Link>
      </div>

      {loading && <p className="text-neutral-400">Loading…</p>}
      {error && (
        <p data-testid="my-leagues-error" className="text-red-500">
          {error}
        </p>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="text-neutral-400">You haven’t created any leagues yet.</p>
      )}

      <ul className="space-y-2" data-testid="my-leagues-list">
        {rows.map((lg) => (
          <li
            key={lg.id}
            className="rounded-lg bg-neutral-950 p-3 flex items-center justify-between gap-3"
          >
            <Link
              href={`/leagues/${lg.id}`}
              className="hover:underline"
              data-testid="my-leagues-item"
            >
              <div className="font-medium">{lg.name}</div>
            </Link>
            <Link
              href={`/leagues/${lg.id}/invites/bulk`}
              className="text-xs rounded border px-2 py-1 hover:bg-neutral-800"
              data-testid="invite-from-league"
            >
              Invite
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
