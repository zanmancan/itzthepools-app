// src/app/auth/session/route.ts
// Receives { event, session } from the client and sets/removes the
// Supabase auth cookies on the server using @supabase/ssr.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "@/lib/env";

type Payload = {
  event: "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
  session?: {
    access_token?: string | null;
    refresh_token?: string | null;
  } | null;
};

export async function POST(req: Request) {
  const { event, session } = (await req.json()) as Payload;

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
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      // Persist the session in HttpOnly cookies
      await supabase.auth.setSession({
        access_token: session?.access_token ?? "",
        refresh_token: session?.refresh_token ?? "",
      });
    } else if (event === "SIGNED_OUT") {
      await supabase.auth.signOut();
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[auth/session] failed:", e);
    return NextResponse.json({ ok: false, error: "cookie-sync-failed" }, { status: 500 });
  }
}
