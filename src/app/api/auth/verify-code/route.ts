// src/app/api/auth/verify-code/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify-code
 * Body: { email: string; token: string; type?: "signup" | "magiclink" | "recovery" | "email_change" }
 *
 * Verifies an email OTP / magic link code.
 * NOTE: Supabase types are noisy in strict TS; we use a tiny "any" cast.
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const { email, token, type }: { email?: string; token?: string; type?: string } = await req
    .json()
    .catch(() => ({} as any));

  if (!email || !token) {
    return jsonWithRes(response, { error: "email and token are required" }, 400);
  }

  const auth: any = sb.auth;

  try {
    const { data, error } = await auth.verifyOtp({
      email,
      token,
      type: (type as any) || "magiclink",
    });

    if (error) {
      return jsonWithRes(response, { error: error.message }, 400);
    }

    return jsonWithRes(response, { ok: true, data });
  } catch (e: any) {
    return jsonWithRes(
      response,
      { error: e?.message || "Unexpected error verifying code." },
      500
    );
  }
}
