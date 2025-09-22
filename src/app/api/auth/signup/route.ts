// src/app/api/auth/signup/route.ts
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
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) return jsonWithRes(res, { error: "Email and password are required." }, 400);

    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return jsonWithRes(res, { error: error.message }, 400);

    // Supabase will send a verification email. User must verify then sign in or verify code.
    return jsonWithRes(res, { ok: true, user: data.user ?? null });
  } catch (e: any) {
    return jsonWithRes(res, { error: e?.message || "Signup error" }, 500);
  }
}
