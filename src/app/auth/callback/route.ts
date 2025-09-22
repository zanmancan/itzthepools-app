// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  const cookieNext = req.cookies.get("next_after_auth")?.value ?? null;

  const safe = (v?: string | null) => (v && v.startsWith("/") ? v : "/dashboard");
  const redirectTo = safe(nextParam || cookieNext);

  const { client: sb, response: res } = supabaseRoute(req);

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      const r = NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
      );
      res.headers.forEach((val, key) => r.headers.set(key, val));
      return r;
    }
  }

  // Clear fallback cookie
  res.headers.append(
    "Set-Cookie",
    "next_after_auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
  );

  const r = NextResponse.redirect(new URL(redirectTo, url.origin));
  res.headers.forEach((val, key) => r.headers.set(key, val));
  return r;
}
