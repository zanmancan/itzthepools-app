// src/app/api/auth/whoami/route.ts
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { client, response } = supabaseServer(req);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return jsonWithRes(response, { authenticated: false }, 401);
  return jsonWithRes(response, { authenticated: true, email: user.email }, 200);
}
