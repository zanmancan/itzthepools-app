// middleware.ts
// Keeps Supabase auth cookies fresh across RSC navigations.
// If you already have middleware, merge this logic.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  // Currently a pass-through. If you adopt @supabase/auth-helpers-nextjs
  // refresh logic, you can add it here.
  return NextResponse.next();
}

// Match all app routes by default; narrow if desired.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|fonts).*)"],
};
