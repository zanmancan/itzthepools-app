// src/app/api/test/reset/route.ts
import { NextResponse } from "next/server";
import { resetAll } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProd() {
  return process.env.NODE_ENV === "production";
}

/**
 * POST /api/test/reset
 * Clears in-memory store.
 */
export async function POST() {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });
  resetAll();
  return NextResponse.json({ ok: true });
}
