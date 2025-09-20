// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

/**
 * Only protect these app routes.
 * Leave /api/*, static assets, and public pages (login, invite, etc.) alone.
 */
const PROTECTED: RegExp[] = [
  /^\/dashboard(?:\/.*)?$/,         // /dashboard and anything under it
  /^\/league(?:\/.*)?$/,            // /league and anything under it
];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Skip if this path isn't protected
  const needsAuth = PROTECTED.some((re) => re.test(path));
  if (!needsAuth) return NextResponse.next();

  // Allow CORS preflight without auth
  if (req.method === "OPTIONS") return NextResponse.next();

  /**
   * Supabase sets cookies that start with "sb-" (e.g. sb-access-token/sb-refresh-token).
   * If none are present, bounce to /login and preserve the intended destination.
   * The server/layout will double-check the session on the page load.
   */
  const hasSbCookie = req.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSbCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path || "/dashboard");
    return NextResponse.redirect(url);
  }

  // Let the request through (SSR will confirm the session)
  return NextResponse.next();
}

/**
 * Run middleware on everything except Next internals, image optimizer,
 * static assets, and API routes.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images|assets|api/.*).*)",
  ],
};
