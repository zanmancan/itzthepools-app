// src/app/api/auth/verify-code/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { client, response } = supabaseServer(req);
  const { email, token } = await req.json().catch(() => ({} as any));
  if (!email || !token) return jsonWithRes(response, { error: "Email and code are required." }, 400);

  // Verify the email confirmation OTP. This should also create a session.
  const { error } = await client.auth.verifyOtp({ email, token, type: "email" });
  if (error) return jsonWithRes(response, { error: error.message, code: error.code }, 400);

  return jsonWithRes(response, { ok: true }, 200);
}
