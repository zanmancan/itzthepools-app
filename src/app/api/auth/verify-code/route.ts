// src/app/api/auth/verify-code/route.ts
// Verify a 6-digit OTP for either signup (default) or email login.

import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

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
  const code  = String(body?.code  || body?.token || "").trim();
  const mode  = (String(body?.mode || "signup") as "signup" | "email");

  if (!email || !code) {
    return jsonWithRes(response, { error: "Email and code are required." }, 400);
    }

  try {
    const { error } = await client.auth.verifyOtp({ email, token: code, type: mode });
    if (error) return jsonWithRes(response, { error: error.message, code: error.code }, 400);
    return jsonWithRes(response, { ok: true }, 200);
  } catch (e: any) {
    return jsonWithRes(response, { error: e?.message || "Server error verifying code." }, 500);
  }
}
