// src/lib/supabaseServer.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * @supabase/ssr cookie typing varies across versions, so we keep the adapter `any`.
 */
type AnyCookieOptions = any;

// Cookie adapter used in Route Handlers
function cookieAdapterForRoute(req: NextRequest, res: NextResponse) {
  return {
    get(name: string) {
      return req.cookies.get(name)?.value;
    },
    getAll() {
      return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
    },
    set(name: string, value: string, options: AnyCookieOptions = {}) {
      try {
        res.cookies.set({ name, value, ...(options ?? {}) });
      } catch {
        /* no-op */
      }
    },
    remove(name: string, options: AnyCookieOptions = {}) {
      try {
        res.cookies.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
      } catch {
        /* no-op */
      }
    },
  } as any;
}

// Cookie adapter used in RSC/layout/page (no NextRequest available)
function cookieAdapterForRSC(res: NextResponse) {
  const store = nextCookies();
  return {
    get(name: string) {
      return store.get(name)?.value;
    },
    getAll() {
      return store.getAll().map(({ name, value }) => ({ name, value }));
    },
    set(name: string, value: string, options: AnyCookieOptions = {}) {
      try {
        // We still write to res so Set-Cookie can be forwarded if a caller uses jsonWithRes
        res.cookies.set({ name, value, ...(options ?? {}) });
      } catch {
        /* no-op */
      }
    },
    remove(name: string, options: AnyCookieOptions = {}) {
      try {
        res.cookies.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
      } catch {
        /* no-op */
      }
    },
  } as any;
}

/**
 * OVERLOADS
 * =========
 * supabaseServer()                    -> SupabaseClient           (for pages/RSC)
 * supabaseServer(req: NextRequest)    -> { client, response, url } (for Route Handlers)
 */
export function supabaseServer(): SupabaseClient<any, "public", any>;
export function supabaseServer(
  req: NextRequest
): { client: SupabaseClient<any, "public", any>; response: NextResponse; url: URL };
export function supabaseServer(req?: NextRequest) {
  const res = new NextResponse(null, { headers: new Headers() });

  const cookiesAdapter = req
    ? cookieAdapterForRoute(req, res)
    : cookieAdapterForRSC(res);

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookiesAdapter }
  );

  if (!req) {
    // Pages/RSC usage — return the client directly so existing code using `sb.auth` still works
    return client;
  }
  // Route Handler usage — return full bundle so caller can forward cookies via jsonWithRes(...)
  return { client, response: res, url: new URL(req.url) };
}

/**
 * Back-compat alias used in some routes: identical to calling supabaseServer(req).
 */
export function supabaseRoute(req: NextRequest) {
  return supabaseServer(req);
}

// Optional default export for convenience
export default supabaseServer;

/** Build absolute URL preferring env (Netlify) then request origin. */
export function absoluteUrl(reqOrUrl: NextRequest | URL | undefined, path: string) {
  const envOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_SITE_URL;
  if (envOrigin) return new URL(path, envOrigin).toString();

  const u =
    reqOrUrl instanceof URL
      ? reqOrUrl
      : reqOrUrl && "nextUrl" in (reqOrUrl as any)
      ? (reqOrUrl as NextRequest).nextUrl
      : undefined;

  const origin = u ? `${u.protocol}//${u.host}` : "http://localhost";
  return new URL(path, origin).toString();
}

/** JSON response that forwards any cookies gathered on `base`. */
export function jsonWithRes(
  base: NextResponse,
  body: unknown,
  init?: number | ResponseInit
) {
  const status =
    typeof init === "number" ? init : (init as ResponseInit | undefined)?.status ?? 200;
  const initObj = typeof init === "object" && init ? init : undefined;

  const out = NextResponse.json(body, { status, ...initObj });
  try {
    base.cookies.getAll().forEach((c) => out.cookies.set(c));
  } catch {
    /* no-op */
  }
  return out;
}
