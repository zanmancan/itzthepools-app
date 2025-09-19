import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * Exchanges the `code` for server cookies, then redirects to `next` (if given),
 * otherwise to /dashboard.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next"); // e.g. /join/<token>

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  const target = next && next.startsWith("/") ? next : "/dashboard";
  return NextResponse.redirect(new URL(target, url.origin));
}
