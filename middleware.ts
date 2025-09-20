// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Only protect these paths. We do NOT touch /api/* or static assets.
const PROTECTED = [/^\/dashboard(?:\/.*)?$/, /^\/league(?:\/.*)?$/];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const needsAuth = PROTECTED.some((re) => re.test(path));
  if (!needsAuth) return NextResponse.next();

  // Soft gate: if no Supabase cookie at all, bounce to login.
  // Let the server component on the page double-check the real session.
  const hasSbCookie = req.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSbCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|assets|api/.*).*)"],
};
