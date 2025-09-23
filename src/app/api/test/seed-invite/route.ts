// src/app/api/test/seed-invite/route.ts
import { NextResponse } from "next/server";
import { INVITES, LEAGUES, type League } from "../_store";

function isProd() {
  return process.env.NODE_ENV === "production";
}

export async function POST(request: Request) {
  if (isProd()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const { email, expiresInMins } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, code: "BAD_REQUEST", message: "email is required" },
        { status: 400 }
      );
    }

    // Create (or reuse) a single test league in memory
    let league: League | undefined;
    for (const l of LEAGUES.values()) {
      league = l; break;
    }
    if (!league) {
      league = {
        id: `test-league-${crypto.randomUUID().slice(0, 6)}`,
        name: "Test League",
        teams: new Set<string>(),
      };
      LEAGUES.set(league.id, league);
    }

    const token = crypto.randomUUID().replace(/-/g, "");
    const ttl = typeof expiresInMins === "number" ? expiresInMins : 60;
    const expiresAt = Date.now() + ttl * 60_000;

    INVITES.set(token, {
      token,
      email,
      leagueId: league.id,
      leagueName: league.name,
      expiresAt,
      consumedAt: null,
    });

    const origin = new URL(request.url).origin;
    const inviteUrl = `${origin}/test/invite/${token}`;

    return NextResponse.json({
      ok: true,
      inviteUrl,
      leagueName: league.name,
      token,
      leagueId: league.id,
      email,
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: err?.message ?? "seed failed" },
      { status: 500 }
    );
  }
}
