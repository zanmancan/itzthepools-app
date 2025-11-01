/**
 * Dev test helper — create leagues the way the tests expect.
 * - POST /api/test/leagues  → accepts { id?, name, sport?, season? } and
 *   returns { ok, league } including sport/season in the RESPONSE ONLY.
 *   (We do NOT write sport/season into the store's League type.)
 */

import { NextRequest, NextResponse } from "next/server";
import { getStore, type League } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const id = String(body.id ?? `lg_${Math.random().toString(36).slice(2, 8)}`);
    const name = String(body.name ?? "Test League").trim();
    const ownerId = String(body.ownerId ?? "owner_1");

    const store = getStore();

    // Only store fields allowed by League type
    const league: League = {
      id,
      name,
      ownerId,
      members: { [ownerId]: "owner" },
    };
    store.upsertLeague(league);

    // Echo back optional test-only fields so existing tests keep passing.
    const responseLeague = {
      ...league,
      sport: body.sport ?? "nfl",
      season: body.season ?? "2025",
    };

    return NextResponse.json({ ok: true, league: responseLeague }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
