// src/app/api/invites/token/[token]/route.ts
import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

type League = {
  id: string | number;
  name: string;
  ruleset: string | null;
  season: string | number | null;
};

type InviteRow = {
  id: string | number;
  token: string;
  league: League | League[] | null;
};

function normalizeLeague(league: InviteRow["league"]): League | null {
  if (!league) return null;
  return Array.isArray(league) ? (league[0] ?? null) : league;
}

export async function GET(_req: Request, ctx: { params: { token: string } }) {
  const token = ctx.params?.token;
  if (!token) {
    return NextResponse.json(
      { status: "error", message: "Missing token" },
      { status: 400 }
    );
  }

  const supabase = supabaseRoute();

  const { data, error } = await supabase
    .from("invites")
    .select(
      `
      id,
      token,
      league:leagues (
        id,
        name,
        ruleset,
        season
      )
    `
    )
    .eq("token", token)
    .single<InviteRow>();

  if (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 404 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { status: "error", message: "Invite not found" },
      { status: 404 }
    );
  }

  const league = normalizeLeague(data.league);
  if (!league) {
    return NextResponse.json(
      { status: "error", message: "Invite league missing" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: "ok",
    inviteId: data.id,
    leagueId: league.id,
    leagueName: league.name,
    ruleset: league.ruleset,
    season: league.season,
  });
}
