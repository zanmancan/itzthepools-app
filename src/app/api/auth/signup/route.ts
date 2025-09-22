// src/app/api/auth/signup/route.ts
// Create account (email/password). If email confirmation is ON, a code/link is sent.

import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes, absoluteUrl } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { client, response } = supabaseRoute(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonWithRes(response, { error: "Invalid JSON body." }, 400);
  }

  const email = String(body?.email || "").trim();
  const password = String(body?.password || "");

  if (!email || !password) {
    return jsonWithRes(response, { error: "Email and password are required." }, 400);
  }
  if (password.length < 6) {
    return jsonWithRes(response, { error: "Password must be at least 6 characters." }, 400);
  }

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        // Safe even if you mainly use OTP codes.
        emailRedirectTo: absoluteUrl("/auth/callback"),
      },
    });
    if (error) return jsonWithRes(response, { error: error.message, code: error.code }, 400);

    const needsVerification = !data?.user?.email_confirmed_at;
    return jsonWithRes(response, { ok: true, needsVerification }, 200);
  } catch (e: any) {
    return jsonWithRes(response, { error: e?.message || "Server error during sign up." }, 500);
  }
}
