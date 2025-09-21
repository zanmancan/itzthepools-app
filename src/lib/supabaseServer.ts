// src/lib/supabaseServer.ts
// Unified Supabase helpers for App Router (API routes + Server Components)

import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers"; // ✅ headers() & cookies() both come from next/headers
import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/* =========================
 * API routes: bind client to req/res for cookie passthrough
 * ========================= */
export function supabaseRoute(req: NextRequest): {
  client: ReturnType<typeof createServerClient>;
  response: NextResponse;
} {
  const res = NextResponse.next();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  return { client, response: res };
}

/* =========================
 * Return JSON and forward any Set-Cookie headers Supabase wrote to our temp response
 * ========================= */
export function jsonWithRes(res: NextResponse, body: any, status = 200, init?: ResponseInit) {
  const out = NextResponse.json(body, { status, ...init });
  // forward cookies that were set on the intermediary response
  res.headers.forEach((v, k) => {
    if (k.toLowerCase() === "set-cookie") out.headers.append("set-cookie", v);
  });
  return out;
}

/* =========================
 * Server Components: read-only cookies via next/headers
 * ========================= */
export function createSbServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set() {
          /* no-op in server components */
        },
        remove() {
          /* no-op in server components */
        },
      },
    }
  );
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* =========================
 * absoluteUrl — builds a full URL for emails/links and API callbacks
 * Priority:
 *  1) NEXT_PUBLIC_SITE_URL (use full https://host)
 *  2) VERCEL_URL / RENDER_EXTERNAL_URL (host only)
 *  3) request Host header (when available)
 *  4) http://localhost:3000
 * ========================= */
export function absoluteUrl(path = "/"): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : null);

  let base = envUrl;
  if (!base) {
    // try current request host if called server-side during a request
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

  // Ensure single leading slash on path
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, base).toString();
}
