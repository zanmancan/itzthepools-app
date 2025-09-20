// src/lib/supabaseServer.ts
import { cookies as nextCookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/** Make sure required env is set early and fail with a clear message in dev. */
function assertSupabaseEnv() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
}

/**
 * Server Components / actions client.
 * - Reads auth cookies from the current request.
 * - Does NOT write cookies (RSC cookies are read-only).
 */
export function supabaseServer() {
  assertSupabaseEnv();

  const cookieStore = nextCookies(); // read-only in RSC

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // no-ops in RSC; writing happens in route handlers
        set(_name: string, _value: string, _options?: CookieOptions) {},
        remove(_name: string, _options?: CookieOptions) {},
      },
    }
  );
}

/**
 * Route Handlers client.
 * - Reads cookies from the request.
 * - Writes cookie changes to the provided (or auto-created) NextResponse.
 *
 * Usage (pattern 1 – create response first):
 *   export async function GET(req: NextRequest) {
 *     const { client, response } = supabaseRoute(req);
 *     // ... do auth stuff ...
 *     response.headers.set("x-foo", "bar");
 *     return response; // or NextResponse.json(data, { headers: response.headers })
 *   }
 *
 * Usage (pattern 2 – just need the client; you’ll return your own response):
 *   const { client } = supabaseRoute(req) // cookie writes still attach to an internal response
 */
export function supabaseRoute(req?: NextRequest) {
  assertSupabaseEnv();

  // If caller gave us a request, wire cookie reads from it.
  // We’ll always create a NextResponse to collect cookie writes.
  const res = NextResponse.next();

  // Helpers that mirror the @supabase/ssr requirements
  const cookieAdapter = {
    get: (name: string) => {
      if (req) return req.cookies.get(name)?.value;
      // fallback to current context if not in a route (rare)
      return nextCookies().get(name)?.value;
    },
    set: (name: string, value: string, options?: CookieOptions) => {
      res.cookies.set(name, value, options);
    },
    remove: (name: string, options?: CookieOptions) => {
      res.cookies.set(name, "", { ...options, maxAge: 0 });
    },
  };

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieAdapter }
  );

  return { client, response: res };
}

/** Optional alias some files prefer (won’t break existing imports) */
export const supabaseRouteClient = supabaseRoute;
