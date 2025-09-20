// src/lib/supabaseServer.ts
// Unified Supabase helpers for Server Components and Route Handlers
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Server Components / Server Actions / Layouts:
 * Uses next/headers cookies() (read/write best-effort; middleware does the refresh).
 */
export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // In RSC this may be a no-op; middleware will refresh cookies on nav.
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* noop */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            /* noop */
          }
        },
      },
    }
  );
}

/**
 * Route Handlers (app/api/**): call inside your handler with req/res
 * so cookies are read from the incoming request and written to the response.
 *
 * Example:
 *   export async function GET(req: NextRequest) {
 *     const res = new NextResponse();
 *     const sb = supabaseRoute(req, res);
 *     const { data: { user } } = await sb.auth.getUser();
 *     return res; // res now contains any refreshed cookies
 *   }
 */
export function supabaseRoute(req: NextRequest, res: NextResponse) {
  return createServerClient(
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
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );
}
