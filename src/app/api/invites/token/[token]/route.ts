// src/app/api/invites/token/[token]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

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
  // We'll defensively accept both to avoid type errors in CI.
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
    return NextResponse.json({ status: "error", message: "Missing token" }, { status: 400 });
  }

  // Supabase server client (reads service cookies for RLS)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }
  );

  // Query the invite + joined league
  // NOTE: Use `.single()` to force a single row and avoid array typing on the row itself.
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
    return NextResponse.json({ status: "error", message: error.message }, { status: 404 });
  }
  if (!data) {
    return NextResponse.json({ status: "error", message: "Invite not found" }, { status: 404 });
  }

  const league = normalizeLeague(data.league);
  if (!league) {
    return NextResponse.json({ status: "error", message: "Invite league missing" }, { status: 500 });
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
