import { NextResponse } from "next/server";
import { INVITES } from "@/app/api/test/_store";

/**
 * GET /api/invites/list?leagueId=...
 * Returns all invites or those scoped to a league.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get("leagueId");

    const rows = leagueId
      ? INVITES.filter((i) => i.leagueId === leagueId)
      : INVITES;

    return NextResponse.json({ ok: true, invites: rows }, { status: 200 });
  } catch (err) {
    console.error("[/api/invites/list] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to list invites" },
      { status: 500 }
    );
  }
}
