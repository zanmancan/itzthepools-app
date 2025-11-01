import { NextResponse } from "next/server";
import { resetStore } from "@/app/api/test/_store";
import devStore from "@/lib/devStore";

/**
 * Unified reset for E2E/dev.
 * - Resets the canonical test store used by /api/test/* helpers
 * - Resets the ui/devStore used by dashboard panels & server components
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Core reset work */
async function doReset() {
  // 1) Reset canonical store (used by the test helper APIs)
  const { leagues, invites } = resetStore();

  // 2) Reset devStore (used by UI panels / server components)
  devStore.reset();

  return { leaguesCount: leagues.length, invitesCount: invites.length };
}

/** Specs call POST /api/test/reset and expect JSON */
export async function POST() {
  try {
    const counts = await doReset();
    return NextResponse.json({ ok: true, counts }, { status: 200 });
  } catch (err) {
    console.error("[/api/test/reset] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to reset store" },
      { status: 500 }
    );
  }
}

/** Optional GET so you can hit it in a browser; delegates to POST logic */
export async function GET() {
  try {
    const counts = await doReset();
    return NextResponse.json({ ok: true, counts }, { status: 200 });
  } catch (err) {
    console.error("[/api/test/reset] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to reset store" },
      { status: 500 }
    );
  }
}
