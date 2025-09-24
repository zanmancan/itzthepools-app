// src/app/api/test/reset/route.ts
import { NextResponse } from "next/server";
import { INVITES, LEAGUES } from "../_store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProd() {
  return process.env.NODE_ENV === "production";
}

/** Dev-only: clears in-memory test data so E2E tests don't interfere. */
export async function POST() {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });
  INVITES.clear();
  LEAGUES.clear();
  return NextResponse.json({ ok: true });
}
