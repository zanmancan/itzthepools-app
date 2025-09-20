// src/app/auth/complete/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("redirect") || "/dashboard";
  const type = url.searchParams.get("type"); // 'recovery' for reset links

  const jar = cookies();

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
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

  try {
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  } catch (err) {
    console.error("[auth/complete] code exchange failed:", err);
    const fail = new URL("/login", env.siteUrl);
    fail.searchParams.set("error", "Could not complete sign-in.");
    return NextResponse.redirect(fail);
  }

  const dest = type === "recovery" ? "/auth/reset" : next;
  return NextResponse.redirect(new URL(dest, env.siteUrl));
}
