// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const next = url.searchParams.get("next") || "/dashboard";
  const redirectTo = new URL(next, url.origin);

  // Prepare redirect response we can attach cookies to
  const res = NextResponse.redirect(redirectTo.toString());

  // Supabase SSR client wired to this response's cookies
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, expires: new Date(0) });
        },
      },
    }
  );

  // IMPORTANT: pass a **string** to exchangeCodeForSession
  const { error } = await client.auth.exchangeCodeForSession(req.url);

  if (error) {
    // Surface error on the destination if you want to read it
    redirectTo.searchParams.set("auth_error", error.message);
    return NextResponse.redirect(redirectTo.toString());
  }

  return res;
}
