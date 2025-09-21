// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { siteOrigin } from "@/lib/siteOrigin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Where to send the user after auth completes
  const nextPath = url.searchParams.get("next") || "/dashboard";
  const redirectTo = new URL(nextPath, siteOrigin());

  // Prepare redirect response now so we can attach cookies to it
  const res = NextResponse.redirect(redirectTo.toString());

  const code = url.searchParams.get("code");
  if (!code) {
    redirectTo.searchParams.set("auth_error", "missing_code");
    return res; // still land on app
  }

  // Cookie adapter works with both old/new @supabase/ssr shapes
  const cookies = {
    get(name: string) {
      return req.cookies.get(name)?.value;
    },
    set(name: string, value: string, options?: CookieOptions) {
      res.cookies.set(name, value, options);
    },
    remove(name: string, options?: CookieOptions) {
      // expire immediately (broad browser support)
      res.cookies.set(name, "", { ...options, expires: new Date(0) });
    },
  } as any;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    redirectTo.searchParams.set("auth_error", error.message);
    return res;
  }

  return res;
}
