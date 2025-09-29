import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = {
      ok: true,
      now: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV ?? null,
      e2eSafety: process.env.NEXT_PUBLIC_E2E_DEV_SAFETY ?? null,
      useSupabase: process.env.NEXT_PUBLIC_USE_SUPABASE ?? null,
      commit:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.NETLIFY_COMMIT_REF ??
        process.env.COMMIT_SHA ??
        null,
      port: process.env.PORT ?? null,
    };
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[/api/test/health] error:", err);
    return NextResponse.json(
      { ok: false, error: "health probe failed" },
      { status: 500 }
    );
  }
}
