import { NextResponse } from "next/server";
import { LEAGUES, INVITES } from "@/app/api/test/_store";

/**
 * GET /api/test/debug
 * Introspects the in-memory store. Useful for quick sanity checks in dev.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Avoid iterating a record as an array — use Object.entries safely.
    const leagues = LEAGUES.map((l) => ({
      id: l.id,
      name: l.name,
      ownerId: l.ownerId,
      memberCount: Object.keys(l.members).length,
      members: l.members,
    }));

    const invites = INVITES.map((i) => ({
      id: i.id,
      leagueId: i.leagueId,
      email: i.email,
      role: i.role,
      token: i.token,
      status: i.status,
      createdAt: i.createdAt,
    }));

    return NextResponse.json(
      {
        ok: true,
        counts: { leagues: LEAGUES.length, invites: INVITES.length },
        leagues,
        invites,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[/api/test/debug] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to read test debug state" },
      { status: 500 }
    );
  }
}
