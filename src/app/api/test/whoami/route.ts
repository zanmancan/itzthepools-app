// src/app/api/test/whoami/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function readTestUserCookie(req: NextRequest): string | null {
  const keys = ["e2e_user", "x-e2e-user", "e2e-test-user", "x-test-user"];
  for (const k of keys) {
    const v = req.cookies.get(k)?.value?.trim();
    if (v) return v;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const testUser = readTestUserCookie(req);
  if (testUser) return json({ ok: true, mode: "test", user: testUser });

  // fall back to real mode check
  try {
    const { supabaseRoute } = await import("@/lib/supabaseServer");
    const { client: sb } = supabaseRoute(req);
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, mode: "real", userId: user?.id ?? null, email: user?.email ?? null });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Unhandled error" }, 500);
  }
}
