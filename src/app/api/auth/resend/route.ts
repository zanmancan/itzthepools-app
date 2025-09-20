// src/app/api/auth/resend/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { client, response } = supabaseServer(req);
  const { email } = await req.json().catch(() => ({} as any));
  if (!email) return jsonWithRes(response, { error: "Email is required." }, 400);

  // Resend signup confirmation email
  const { error } = await client.auth.resend({ type: "signup", email });
  if (error) return jsonWithRes(response, { error: error.message, code: error.code }, 500);

  return jsonWithRes(response, { ok: true }, 200);
}
