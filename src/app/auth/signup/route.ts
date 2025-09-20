// src/app/api/auth/signup/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes, absoluteUrl } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { client, response } = supabaseServer(req);

  let email = "", password = "", next = "/dashboard";
  try {
    const body = await req.json();
    email = String(body?.email || "").trim();
    password = String(body?.password || "");
    if (body?.next) next = String(body.next);
  } catch {
    /* ignore */
  }

  if (!email || !password) {
    return jsonWithRes(response, { error: "Email and password are required." }, 400);
  }

  // Build redirect back to our callback, preserving "next"
  const redirect = absoluteUrl(req, `/auth/callback?next=${encodeURIComponent(next)}`).toString();

  const { error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirect },
  });

  if (error) {
    return jsonWithRes(response, { error: error.message, code: error.code }, 400);
  }

  // With email confirmations ON, no session yet—tell the client to show "check inbox"
  return jsonWithRes(response, { ok: true, emailSent: true }, 200);
}
