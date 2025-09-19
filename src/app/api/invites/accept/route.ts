// src/app/api/invites/accept/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * POST /api/invites/accept
 * Body: { token: string }
 *
 * Minimal placeholder: validates input & auth, then returns { status: "ok" }.
 * TODO: Add your real "accept invite" DB updates here.
 */
export async function POST(req: Request) {
  // Parse JSON body (tolerant of empty/invalid JSON)
  const body = (await req.json().catch(() => ({}))) as Partial<{ token: string }>;
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json(
      { status: "error", message: "Missing token" },
      { status: 400 }
    );
  }

  const supabase = createRouteHandlerClient({ cookies });

  // Require a signed-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized" },
      { status: 401 }
    );
  }

  // Optional: sanity check that the token exists.
  // NOTE: This is read-only; add your real mutation later.
  const { data: invite, error } = await supabase
    .from("invites")
    .select("id")
    .eq("token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { status: "error", message: "Invalid invite token" },
      { status: 404 }
    );
  }

  // TODO: Insert membership / update invite as accepted, etc.
  // Keeping this a no-op right now so builds stay green.

  return NextResponse.json({ status: "ok" });
}
