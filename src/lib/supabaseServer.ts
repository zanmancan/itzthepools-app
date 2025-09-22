// src/lib/supabaseServer.ts
// Unified Supabase helpers for App Router (API routes + Server Components)

import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/* =========================
 * API routes: bind client to req/res for cookie passthrough
 * ========================= */
export function supabaseRoute(req: NextRequest): {
  client: ReturnType<typeof createServerClient>;
  response: NextResponse;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const res = NextResponse.next();

  const client = createServerClient(url, anon, {
    cookies: {
      // Read from the *incoming* request
      get: (name: string) => req.cookies.get(name)?.value,
      // When Supabase needs to set/clear cookies, write them onto `res`
      set: (name: string, value: string, options: any) => {
        res.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: any) => {
        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  return { client, response: res };
}

/* =========================
 * Return JSON and forward any Set-Cookie written onto `res`
 * ========================= */
export function jsonWithRes(res: NextResponse, body: any, status = 200, init?: ResponseInit) {
  const out = NextResponse.json(body, { status, ...init });

  // Safer: forward cookies using the cookie API to preserve multiple Set-Cookie headers
  const toForward = res.cookies.getAll?.() ?? [];
  for (const c of toForward) {
    out.cookies.set(c);
  }

  return out;
}

/* =========================
 * Server Components: read-only cookies via next/headers
 * ========================= */
export function createSbServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const cookieStore = cookies();
  return createServerClient(url, anon, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set() {
        /* no-op in server components */
      },
      remove() {
        /* no-op in server components */
      },
    },
  });
}

/* Back-compat alias (some files import this name) */
export function supabaseServer() {
  return createSbServer();
}

/* =========================
 * Service-role client (SERVER ONLY)
 * Uses SUPABASE_SERVICE_ROLE_KEY — never expose to client code.
 * ========================= */
export function supabaseService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* =========================
 * absoluteUrl — builds a full URL for emails/links and API callbacks
 * ========================= */
export function absoluteUrl(path = "/"): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : null);

  let base = envUrl;
  if (!base) {
    try {
      const h = headers();
      const host = h.get("x-forwarded-host") || h.get("host");
      const proto = h.get("x-forwarded-proto") || "http";
      if (host) base = `${proto}://${host}`;
    } catch {
      // headers() not available (e.g., build time)
    }
  }
  if (!base) base = "http://localhost:3000";

  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, base).toString();
}
