/**
 * REST collection for leagues (dev/test only).
 * - GET  /api/leagues      → list all leagues
 * - POST /api/leagues      → create a league
 *
 * Uses the canonical in-memory store from /api/test/_store so all tests share
 * the same backing data. Keep the response shape stable:
 *   { ok: true, league: { id, name } }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStore, type League } from "@/app/api/test/_store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET: list all leagues (dev convenience) */
export async function GET() {
  const store = getStore();
  return NextResponse.json({ ok: true, leagues: store.LEAGUES }, { status: 200 });
}

/** POST: create a league */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim() || "My League";
    const ownerId = String(body.ownerId ?? "owner_1");

    // Generate a compact, readable id if not provided
    const id: string =
      String(body.id ?? "") ||
      `lg_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}_${Math.floor(
        Math.random() * 90_000 + 10_000
      )}`;

    const league: League = {
      id,
      name,
      ownerId,
      members: { [ownerId]: "owner" },
    };

    const store = getStore();
    store.upsertLeague(league);

    return NextResponse.json({ ok: true, league }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
