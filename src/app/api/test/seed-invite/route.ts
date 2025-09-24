// src/app/api/test/seed-invite/route.ts
import { NextResponse } from "next/server";
import { INVITES, LEAGUES, type League } from "../_store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProd() {
  return process.env.NODE_ENV === "production";
}

/**
 * Dev-only: seed an invite.
 * Body:
 *   {
 *     email: string,              // required
 *     expiresInMins?: number,     // optional (default 60)
 *     leagueId?: string | null    // optional: if provided and exists, use it; otherwise
 *                                 // - if omitted, we REUSE an existing league if any,
 *                                 //   else we create one. This enables duplicate-name tests.
 *   }
 */
export async function POST(request: Request) {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    const expiresInMins = Number.isFinite(body?.expiresInMins)
      ? Number(body.expiresInMins)
      : 60;
    const requestedLeagueId = body?.leagueId
      ? String(body.leagueId).trim()
      : "";

    if (!email) {
      return NextResponse.json(
        { ok: false, code: "BAD_REQUEST", message: "email required" },
        { status: 400 }
      );
    }

    // Pick league:
    // 1) If leagueId is provided and exists, use it.
    // 2) Else, if there is at least one existing league in the store, reuse the first one.
    // 3) Else, create a fresh league.
    let leagueId = requestedLeagueId;
    let leagueName = "Test League";

    if (leagueId && LEAGUES.has(leagueId)) {
      leagueName = LEAGUES.get(leagueId)!.name;
    } else if (LEAGUES.size > 0) {
      const first = LEAGUES.values().next().value as League;
      leagueId = first.id;
      leagueName = first.name;
    } else {
      leagueId = `lg_${crypto.randomUUID().slice(0, 8)}`;
      const league: League = { id: leagueId, name: leagueName, teams: new Set() };
      LEAGUES.set(leagueId, league);
    }

    const token = `tk_${crypto.randomUUID().slice(0, 12)}`;
    const expiresAt = Date.now() + expiresInMins * 60_000;

    INVITES.set(token, {
      token,
      email,
      leagueId,
      leagueName,
      expiresAt,
      consumedAt: null,
    });

    const inviteUrl = `/invite/${token}`;

    return NextResponse.json({
      ok: true,
      inviteUrl,
      leagueName,
      token,
      leagueId,
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
