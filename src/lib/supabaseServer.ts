// src/lib/supabaseServer.ts
// SSR helpers using @supabase/ssr, with legacy-compatible exports.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "@/lib/env";

// For Server Components / server actions
export function supabaseServer() {
  const jar = cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return jar.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Use object-style so types line up with Next + @supabase/ssr
        jar.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        jar.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

// For Route Handlers (/app/api/**) – compatibility export
export function supabaseRoute() {
  const jar = cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return jar.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        jar.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        jar.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}
