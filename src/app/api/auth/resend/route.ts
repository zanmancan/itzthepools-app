// src/app/api/auth/resend/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes, absoluteUrl } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/resend
 * Body: { email: string, type?: "signup" | "magiclink" | "recovery" | "email_change" }
 * Resends a Supabase auth email. Default type = "magiclink".
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const { email, type }: { email?: string; type?: string } = await req
    .json()
    .catch(() => ({} as any));

  if (!email) {
    return jsonWithRes(response, { error: "Email is required." }, 400);
  }

  // Where the email magic-link should land after the user clicks it
  const redirectTo = absoluteUrl("/auth/complete");

  // v2 typings on .resend can be noisy in strict TS; use a tiny cast.
  const auth: any = sb.auth;

  try {
    const { error } = await auth.resend({
      type: (type as any) || "magiclink",
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      return jsonWithRes(response, { error: error.message }, 400);
    }

    return jsonWithRes(response, { ok: true });
  } catch (e: any) {
    return jsonWithRes(
      response,
      { error: e?.message || "Unexpected error while resending email." },
      500
    );
  }
}
