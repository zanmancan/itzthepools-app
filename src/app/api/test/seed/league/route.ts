import { NextResponse } from "next/server";
import devStore from "@/lib/devStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal type wrapper so we don't rely on private types
type StoreLike = {
  listLeagues?: () => unknown[];
  reset?: () => void;
  upsertLeague?: (league: unknown) => unknown;
  createLeague?: (league: unknown) => unknown;
};

const store = devStore as unknown as StoreLike;

/**
 * GET /api/test/seed/league
 * Convenience endpoint: returns current leagues (if supported by devStore).
 */
export async function GET() {
  try {
    const leagues = store.listLeagues ? store.listLeagues() : [];
    return NextResponse.json({ ok: true, leagues }, { status: 200 });
  } catch (err) {
    console.error("[/api/test/seed/league] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to list leagues" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/test/seed/league
 * Body (optional): { id, name, sport, season }
 * Seeds/updates a league in the dev in-memory store.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<{
      id: string;
      name: string;
      sport: string;
      season: string;
    }>;

    const league = {
      id: body.id ?? "seed-league",
      name: body.name ?? "Seed League",
      sport: body.sport ?? "nfl",
      season: body.season ?? "2025",
    };

    // Prefer upsertLeague; fall back to createLeague; otherwise just echo
    const saved =
      (store.upsertLeague && store.upsertLeague(league)) ||
      (store.createLeague && store.createLeague(league)) ||
      league;

    return NextResponse.json({ ok: true, league: saved }, { status: 200 });
  } catch (err) {
    console.error("[/api/test/seed/league] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to seed league" },
      { status: 500 }
    );
  }
}
