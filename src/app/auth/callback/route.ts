// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { siteOrigin } from "@/lib/siteOrigin";
import { devlog } from "@/lib/devlog";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const nextPath = url.searchParams.get("next") || "/dashboard";
  const redirectTo = new URL(nextPath, siteOrigin());
  const res = NextResponse.redirect(redirectTo.toString());

  const code = url.searchParams.get("code");
  if (!code) {
    redirectTo.searchParams.set("auth_error", "missing_code");
    devlog("[callback] missing code, redirecting", redirectTo.toString());
    return res;
  }

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

  devlog("[callback] exchanging code…", { nextPath });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectTo.searchParams.set("auth_error", error.message);
    devlog("[callback] exchange failed", error.message);
    return res;
  }

  devlog("[callback] ok →", redirectTo.toString());
  return res;
}
