// src/app/league/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import LeagueTeamNameForm from "@/components/LeagueTeamNameForm";
import { useToast } from "@/components/Toast";

type League = {
  id: string;
  name: string;
  ruleset: string;
  season: string;
};

export default function LeagueDetailPage({ params }: { params: { id: string } }) {
  const leagueId = params.id;
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const sp = useSearchParams();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leagues")
        .select("id,name,ruleset,season")
        .eq("id", leagueId)
        .single();

      if (error) {
        addToast(error.message, "error");
      }
      setLeague(data ?? null);
      setLoading(false);
    })();
  }, [leagueId, addToast]);

  // Optional welcome toast if coming from Join flow
  useEffect(() => {
    if (sp.get("welcome") === "1") {
      addToast("Welcome! Set your team name for this league below.", "success");
    }
  }, [sp, addToast]);

  if (loading) {
    return (
      <div className="card max-w-2xl">
        <div className="h1">League</div>
        <p className="opacity-70 mt-2">Loading…</p>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="card max-w-2xl">
        <div className="h1">League</div>
        <p className="text-red-400 mt-2">League not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="h1">{league.name}</div>
        <div className="opacity-70">{league.ruleset} — {league.season}</div>
      </div>

      {/* Per-league Team Name editor */}
      <LeagueTeamNameForm leagueId={league.id} />

      {/* You can add more league content below (standings, entries, etc.) */}
    </div>
  );
}
