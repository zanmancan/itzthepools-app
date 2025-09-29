import { NextResponse } from "next/server";
import { resetStore } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/test/reset
 * Resets the in-memory store to fresh seed data.
 * Returns counts so E2E can assert quickly.
 */
export async function POST() {
  try {
    const { leagues, invites } = resetStore();
    return NextResponse.json(
      {
        ok: true,
        counts: { leagues: leagues.length, invites: invites.length },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[/api/test/reset] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to reset store" },
      { status: 500 }
    );
  }
}

/** Optional GET for manual browser pokes */
export async function GET() {
  return POST();
}
