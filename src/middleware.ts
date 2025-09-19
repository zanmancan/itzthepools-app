// middleware.ts
// Keeps Supabase auth cookies fresh across RSC navigations.
// Currently a pass-through; add refresh logic later if needed.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|fonts).*)"],
};
