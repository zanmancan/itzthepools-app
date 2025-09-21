import { NextRequest, NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Trimmed env getter so stray whitespace doesn't break keys
function reqEnv(name: string) {
  let v = process.env[name];
  if (!v) throw new Error(`[env] Missing ${name}`);
  v = v.trim();
  if (!v) throw new Error(`[env] Empty after trim: ${name}`);
  return v;
}

type AnyCookieOptions = CookieOptions | any;

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
      try { res.cookies.set({ name, value, ...(options ?? {}) }); } catch {}
    },
    remove(name: string, options: AnyCookieOptions = {}) {
      try { res.cookies.set({ name, value: "", ...(options ?? {}), maxAge: 0 }); } catch {}
    },
  } as any;
}

// Cookie adapter used in RSC/layout/page (no NextRequest available)
function cookieAdapterForRSC(res: NextResponse) {
  const store = nextCookies();
  return {
    get(name: string) { return store.get(name)?.value; },
    getAll() { return store.getAll().map(({ name, value }) => ({ name, value })); },
    set(name: string, value: string, options: AnyCookieOptions = {}) {
      try { res.cookies.set({ name, value, ...(options ?? {}) }); } catch {}
    },
    remove(name: string, options: AnyCookieOptions = {}) {
      try { res.cookies.set({ name, value: "", ...(options ?? {}), maxAge: 0 }); } catch {}
    },
  } as any;
}

/**
 * OVERLOADS
 * =========
 * supabaseServer()                    -> SupabaseClient           (for pages/RSC) [ANON]
 * supabaseServer(req: NextRequest)    -> { client, response, url } (for Route Handlers) [ANON]
 */
export function supabaseServer(): SupabaseClient<any, "public", any>;
export function supabaseServer(
  req: NextRequest
): { client: SupabaseClient<any, "public", any>; response: NextResponse; url: URL };
export function supabaseServer(req?: NextRequest) {
  const res = new NextResponse(null, { headers: new Headers() });
  const cookiesAdapter = req ? cookieAdapterForRoute(req, res) : cookieAdapterForRSC(res);

  const client = createServerClient(
    reqEnv("NEXT_PUBLIC_SUPABASE_URL"),
    reqEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { cookies: cookiesAdapter }
  );

  if (!req) return client; // Pages/RSC usage
  return { client, response: res, url: new URL(req.url) }; // Route handler usage
}

/** Back-compat alias */
export function supabaseRoute(req: NextRequest) {
  return supabaseServer(req);
}

/** Server-only service-role client (webhooks/cron) */
export function supabaseService(): SupabaseClient<any, "public", any> {
  const url = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = reqEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "itzthepools-service" } },
  });
}

export default supabaseServer;

/** Build absolute URL preferring env (Netlify) then request origin. */
export function absoluteUrl(reqOrUrl: NextRequest | URL | undefined, path: string) {
  const envOrigin =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_SITE_URL;
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
export function jsonWithRes(base: NextResponse, body: unknown, init?: number | ResponseInit) {
  const status =
    typeof init === "number" ? init : (init as ResponseInit | undefined)?.status ?? 200;
  const initObj = typeof init === "object" && init ? init : undefined;

  const out = NextResponse.json(body, { status, ...initObj });
  try { base.cookies.getAll().forEach((c) => out.cookies.set(c)); } catch {}
  return out;
}
