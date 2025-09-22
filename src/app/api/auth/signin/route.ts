// src/app/api/auth/signin/route.ts
// Sign in with email/password and persist the Supabase session cookies.
// Uses supabaseRoute(req) so Set-Cookie headers are forwarded.

import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Bind client to the incoming request so auth cookies flow back out
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

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return jsonWithRes(response, { error: error.message, code: error.code }, 401);
    if (!data?.session) return jsonWithRes(response, { error: "No session returned." }, 500);

    return jsonWithRes(response, { ok: true }, 200);
  } catch (e: any) {
    return jsonWithRes(response, { error: e?.message || "Server error during sign in." }, 500);
  }
}
