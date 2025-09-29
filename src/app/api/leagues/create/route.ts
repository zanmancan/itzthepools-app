// Creates a league in the in-memory dev store AND sets a cookie so all workers
// and the dashboard/test APIs know which league was just created by this user.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore, type League } from "@/app/api/test/_store";
import { persistAddLeague } from "@/app/api/test/_persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple dev id
function randId(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return `lg_${s}`;
}

// Minimal League factory that satisfies the test store shape
function mkLeague(id: string, name: string, ownerId: string): League {
  // ownerEmail is not asserted by tests; keep it null-safe
  return {
    id,
    name,
    season: undefined,
    ruleset: undefined,
    ownerId,
    ownerEmail: null,
    members: { [ownerId]: "owner" },
  } as unknown as League;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const rawName = String(body?.name ?? "").trim();

    if (!rawName) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }
    if (rawName.length < 3) {
      return NextResponse.json({ ok: false, error: "Name must be at least 3 characters" }, { status: 400 });
    }

    // Test/user identity: our test helpers set tp_test_user, and some flows set tp_user.
    const ck = cookies();
    const userId =
      ck.get("tp_test_user")?.value ||
      ck.get("tp_user")?.value ||
      "u_test";

    const id = randId();
    const league = mkLeague(id, rawName, userId);

    // 1) Update in-memory store (the rest of /api/test reads from here)
    const store = getStore();
    store.leagues ??= {};
    store.leagues[id] = league;

    // 2) Persist to disk for cross-worker reads (used by some helper endpoints)
    persistAddLeague(id, rawName, userId);

    // 3) Also drop a handy cookie for UI flows
    const res = NextResponse.json({ ok: true, id, leagueId: id, league }, { status: 200 });
    res.cookies.set("tp_last_created_league", JSON.stringify({ id, name: rawName }), {
      path: "/",
      maxAge: 60 * 5,
      httpOnly: false,
      sameSite: "lax",
    });
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `Create failed: ${err?.message || String(err)}` },
      { status: 500 },
    );
  }
}
