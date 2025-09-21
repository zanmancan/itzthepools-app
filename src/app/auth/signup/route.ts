// src/app/api/auth/signup/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes, absoluteUrl } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/signup
 * Body: { email: string }
 * Sends a magic-link (sign-up) email.
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const { email }: { email?: string } = await req.json().catch(() => ({} as any));
  if (!email) return jsonWithRes(response, { error: "Email is required." }, 400);

  const redirectTo = absoluteUrl("/auth/complete");
  const auth: any = sb.auth;

  const { error } = await auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) return jsonWithRes(response, { error: error.message }, 400);
  return jsonWithRes(response, { ok: true });
}
