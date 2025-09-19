// src/app/api/invites/token/[token]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type League = {
  id: string | number;
  name: string;
  ruleset: string | null;
  season: string | number | null;
};

type InviteRow = {
  id: string | number;
  token: string;
  // Supabase can return a related record as an array or as a single object depending on the select.
  league: League | League[] | null;
};

function normalizeLeague(league: InviteRow["league"]): League | null {
  if (!league) return null;
  return Array.isArray(league) ? (league[0] ?? null) : league;
}

export async function GET(
  _req: Request,
  ctx: { params: { token: string } }
) {
  const token = ctx.params?.token;
  if (!token) {
    return NextResponse.json(
      { status: "error", message: "Missing token" },
      { status: 400 }
    );
  }

  // Correct helper for Next.js App Router route handlers.
  // Uses NEXT_PUBLIC_SUPABASE_URL / ANON_KEY under the hood and attaches auth cookies.
  const supabase = createRouteHandlerClient({ cookies });

  // Query the invite + joined league (force a single row)
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
