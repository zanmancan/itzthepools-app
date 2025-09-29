// src/app/api/test/seed/league/route.ts
import { NextResponse } from "next/server";
import { listLeagues, resetDevDb, upsertLeague } from "@/lib/devStore";

// Ensure this cannot run in prod by requiring the dev safety flag.
function assertDevSafety() {
  const on = process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1";
  if (!on) {
    throw new Error("E2E dev safety off. Refusing to run test seed routes.");
  }
}

// POST /api/test/seed/league
// Body: { name?: string, reset?: boolean }
export async function POST(req: Request) {
  try {
    assertDevSafety();
    const body = await req.json().catch(() => ({}));
    if (body?.reset) resetDevDb();

    const name: string = body?.name || `E2E League ${Date.now()}`;
    const row = upsertLeague({ name });

    return NextResponse.json({ ok: true, league: row });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "seed error" },
      { status: 400 }
    );
  }
}

// GET /api/test/seed/league → list leagues
export async function GET() {
  try {
    assertDevSafety();
    return NextResponse.json({ ok: true, leagues: listLeagues() });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "seed error" },
      { status: 400 }
    );
  }
}

// Keep it dynamic in dev so the in-memory store persists in the server process
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
