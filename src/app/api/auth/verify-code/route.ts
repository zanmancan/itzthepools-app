// src/app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonWithRes(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(res.headers),
    },
  });
}

export async function POST(req: NextRequest) {
  let sb, res: NextResponse;
  try {
    ({ client: sb, response: res } = supabaseRoute(req));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Supabase init failed" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({} as any));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !code) return jsonWithRes(res, { error: "Email and code are required." }, 400);

    // For email+password signup confirmations the type is usually "signup"
    // (If using email OTP directly, this might be "email")
    const { data, error } = await sb.auth.verifyOtp({ email, token: code, type: "signup" });
    if (error) return jsonWithRes(res, { error: error.message }, 400);

    return jsonWithRes(res, { ok: true, user: data?.user ?? null });
  } catch (e: any) {
    console.error("verify-code error:", e);
    return jsonWithRes(res, { error: e?.message || "Verify error" }, 500);
  }
}
