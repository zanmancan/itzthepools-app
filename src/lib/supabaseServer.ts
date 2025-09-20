// src/lib/supabaseServer.ts
// Safe server-side Supabase clients.
//
// - supabaseServer(): for Server Components / layouts (read cookies only; never mutates)
// - supabaseServerMutable(): for Server Actions & Route Handlers (can set/remove cookies)
//
// For compatibility with older API routes that import `supabaseRoute`,
// we also export `supabaseRoute` as an alias of `supabaseServerMutable`.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "@/lib/env";

/** For RSC/layouts: do NOT mutate cookies. */
export function supabaseServer() {
  const jar = cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return jar.get(name)?.value;
      },
      set(_name: string, _value: string, _options?: CookieOptions) {},
      remove(_name: string, _options?: CookieOptions) {},
    },
  });
}

/** For Server Actions & Route Handlers: cookie mutation allowed. */
export function supabaseServerMutable() {
  const jar = cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return jar.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        jar.set(name, value, options);
      },
      remove(name: string, options?: CookieOptions) {
        jar.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });
}

/** Back-compat alias for existing API routes. */
export const supabaseRoute = supabaseServerMutable;
