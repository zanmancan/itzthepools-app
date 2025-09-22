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

// Best-effort origin for email redirect (Supabase may require this)
function getOrigin(req: NextRequest) {
  const hdr = req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
    : req.nextUrl.origin;
  return hdr;
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
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) return jsonWithRes(res, { error: "Email and password are required." }, 400);

    const emailRedirectTo = `${getOrigin(req)}/login`; // where users land after confirming
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (error) {
      // Surface Supabase message (e.g., password policy / disallowed domain)
      return jsonWithRes(res, { error: error.message }, 400);
    }

    return jsonWithRes(res, {
      ok: true,
      user: data?.user ?? null,
      message: "Check your email for a verification code or link.",
    });
  } catch (e: any) {
    // Ensure the client always gets JSON, not a naked 500
    console.error("signup error:", e);
    return jsonWithRes(res, { error: e?.message || "Signup error" }, 500);
  }
}
