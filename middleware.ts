// middleware.ts (root)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow all /api/test/* routes through untouched.
  if (pathname.startsWith("/api/test/")) {
    return NextResponse.next();
  }

  // Real/Supabase mode? do nothing special.
  if (process.env.NEXT_PUBLIC_USE_SUPABASE === "1") {
    return NextResponse.next();
  }

  // Dev/E2E: set a deterministic uid cookie so guards work without real auth.
  const res = NextResponse.next();
  const get = (n: string) => req.cookies.get(n)?.value ?? null;
  const set = (n: string, v: string) => res.cookies.set(n, v, { path: "/" });

  const raw = get("tp_test_user")?.toLowerCase();
  const uid =
    raw === "u_owner" || raw === "owner" ? "u_owner" :
    raw === "u_admin" || raw === "admin" ? "u_admin" :
    raw === "u_member"|| raw === "member"? "u_member" :
    raw === "u_other" || raw === "other" ? "u_other" :
    "u_test";

  set("tp_uid", uid);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
