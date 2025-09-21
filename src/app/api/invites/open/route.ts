// src/app/api/invites/open/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/invites/open
 * Body: { leagueId: string }
 * Creates a **public** invite (no email) for a league (owner/admin only).
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const { leagueId }: { leagueId?: string } = await req.json().catch(() => ({} as any));
  if (!leagueId) return jsonWithRes(response, { error: "leagueId is required" }, 400);

  // who am I
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  // permission
  const lmRes: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lmRes.error) return jsonWithRes(response, { error: lmRes.error.message }, 500);
  const role = String(lmRes?.data?.role || "").toLowerCase();
  const can = role === "owner" || role === "admin";
  if (!can) return jsonWithRes(response, { error: "Forbidden" }, 403);

  // create token
  const token = crypto.randomUUID().replace(/-/g, "");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days

  // insert public invite (no generics)
  const insRes: any = await (sb.from("invites") as any).insert({
    league_id: leagueId,
    email: null,
    token,
    accepted: false,
    created_at: new Date().toISOString(),
    expires_at: expires,
    revoked_at: null,
    is_public: true,
  }).select().maybeSingle?.();

  if (insRes?.error) return jsonWithRes(response, { error: insRes.error.message }, 400);

  return jsonWithRes(response, { ok: true, invite: insRes?.data ?? null, token });
}
