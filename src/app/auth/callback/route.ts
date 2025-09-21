// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { siteOrigin } from "@/lib/siteOrigin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Where to send the user after auth completes
  const nextPath = url.searchParams.get("next") || "/dashboard";
  const redirectTo = new URL(nextPath, siteOrigin());

  // Prepare the redirect response so we can attach cookies to it
  const res = NextResponse.redirect(redirectTo.toString());

  const code = url.searchParams.get("code");
  if (!code) {
    redirectTo.searchParams.set("auth_error", "missing_code");
    return res;
    // NOTE: we still return the redirect response so the user lands on your app.
  }

  // Adapter that works with BOTH cookie type shapes used by @supabase/ssr releases
  const cookiesAdapter = {
    // Present when the lib expects CookieMethodsServer (get/set/remove)
    get(name: string) {
      return req.cookies.get(name)?.value;
    },
    // Present in both the old and new shapes
    set(name: string, value: string, options?: CookieOptionsWithName) {
      res.cookies.set(name, value, options);
    },
    remove(name: string, options?: CookieOptionsWithName) {
      // Clear via immediate expiry for wide browser support
      res.cookies.set(name, "", { ...options, expires: new Date(0) });
    },
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Cast avoids the “must/ must-not have get” version mismatch
      cookies: cookiesAdapter as any,
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectTo.searchParams.set("auth_error", error.message);
    return res;
  }

  return res;
}
