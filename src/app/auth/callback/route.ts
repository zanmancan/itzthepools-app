// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { siteOrigin } from "@/lib/siteOrigin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/dashboard";
  const redirectTo = new URL(next, siteOrigin());

  // Prepare a redirect response we can attach cookies to
  const res = NextResponse.redirect(redirectTo.toString());

  const code = url.searchParams.get("code");
  if (!code) {
    redirectTo.searchParams.set("auth_error", "missing_code");
    return res;
  }

  // Cookie adapter that works across @supabase/ssr versions
  const cookiesAdapter = {
    get(name: string) {
      return req.cookies.get(name)?.value;
    },
    set(name: string, value: string, options?: CookieOptionsWithName) {
      res.cookies.set(name, value, options);
    },
    remove(name: string, options?: CookieOptionsWithName) {
      res.cookies.set(name, "", { ...options, expires: new Date(0) });
    },
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookiesAdapter as any }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    redirectTo.searchParams.set("auth_error", error.message);
    return res;
  }

  return res;
}
