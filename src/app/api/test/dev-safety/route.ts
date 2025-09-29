// Small probe endpoint so E2E can ask the *app* what it thinks the flag is.
// This avoids mismatches between the server terminal and the Playwright terminal.

import { NextResponse } from "next/server";

export const runtime = "nodejs";           // keep it simple for local dev
export const dynamic = "force-dynamic";    // never cache between runs

export async function GET() {
  try {
    const raw = process.env.NEXT_PUBLIC_E2E_DEV_SAFETY ?? null;
    const on = raw === "1"; // STRICT: only "1" turns it on
    return NextResponse.json({ on, raw }, { status: 200 });
  } catch (err) {
    // Robust error reporting for quick troubleshooting
    console.error("[/api/test/dev-safety] error:", err);
    return NextResponse.json(
      { error: "Failed to read NEXT_PUBLIC_E2E_DEV_SAFETY" },
      { status: 500 }
    );
  }
}
