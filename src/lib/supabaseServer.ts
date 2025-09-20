// src/lib/supabaseServer.ts
// Server-side Supabase client that reads/writes the auth cookies.
// This lets server components and routes see the logged-in user.
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

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
        // Next.js server cookies are immutable at runtime; we provide
        // no-ops here because the real writing happens in middleware.
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // ignore — middleware will write cookies on edge
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // ignore — middleware will write cookies on edge
          }
        },
      },
    }
  );
}
