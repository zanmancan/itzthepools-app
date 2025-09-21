// src/app/api/auth/whoami/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/whoami — returns current user (or 401) */
export async function GET(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const { data, error } = await sb.auth.getUser();

  if (error) return jsonWithRes(response, { error: error.message }, 500);
  if (!data?.user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  return jsonWithRes(response, { ok: true, user: data.user });
}
