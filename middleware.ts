// src/middleware.ts
// Ensures Supabase auth cookies get refreshed on navigation.
// Also (optionally) protects /dashboard and /league/*.
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // This call will refresh the session if needed and write cookies to `res`.
  const { data: { user } } = await supabase.auth.getUser();

  // Optional guards: keep them simple (avoid redirect loops).
  const url = req.nextUrl.pathname;
  const needsAuth =
    url.startsWith("/dashboard") ||
    url.startsWith("/league");

  if (needsAuth && !user) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return res;
}

export const config = {
  // Run on all app routes that need session refresh; exclude static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
