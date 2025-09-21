// src/app/api/invites/token/[token]/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/invites/token/[token] — returns invite details by token */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const { client: sb, response } = supabaseRoute(req);

  const token = params?.token;
  if (!token) return jsonWithRes(response, { error: "token required" }, 400);

  const got: any = await sb
    .from("invites")
    .select("id,league_id,email,token,created_at,expires_at,accepted,accepted_at,revoked_at,is_public")
    .eq("token", token)
    .maybeSingle();

  if (got.error) return jsonWithRes(response, { error: got.error.message }, 400);
  if (!got.data) return jsonWithRes(response, { error: "Not found" }, 404);

  return jsonWithRes(response, { ok: true, invite: got.data });
}
