// src/components/MyLeaguesCard.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LeagueRow = {
  id: string;
  name: string;
  season: string | null;
};

export default function MyLeaguesCard() {
  const [leagues, setLeagues] = useState<LeagueRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setLeagues([]);
          setLoading(false);
        }
        return;
      }

      // Keep it simple; if you later need "leagues_for_user" join, swap this query.
      const { data, error } = await supabase
        .from("leagues")
        .select("id, name, season")
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (error) {
          console.error("Failed to load leagues", error);
          setLeagues([]);
        } else {
          setLeagues((data ?? []) as LeagueRow[]);
        }
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">My leagues</h3>
        <Link
          href="/league/new"
          className="rounded-lg border border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-800"
        >
          New league
        </Link>
      </div>

      {loading && <p className="text-neutral-400">Loading…</p>}
      {!loading && (leagues?.length ?? 0) === 0 && (
        <p className="text-neutral-400">You’re not in any leagues yet.</p>
      )}

      <ul className="space-y-2">
        {leagues?.map((lg) => (
          <li key={lg.id} className="rounded-lg bg-neutral-950 p-3">
            <Link href={`/league/${lg.id}`} className="hover:underline">
              <div className="font-medium">{lg.name}</div>
              {lg.season && (
                <div className="text-sm text-neutral-400">
                  Season {lg.season}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
