// src/app/api/leagues/[id]/settings/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/leagues/:id/settings
 * Body: { ...partial settings... }
 * Only league owner can update.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { client: sb, response } = supabaseRoute(req);
  const leagueId = params?.id;

  const payload = (await req.json().catch(() => ({} as any))) as Record<string, any>;
  if (!leagueId) return jsonWithRes(response, { error: "league id required" }, 400);

  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  // owner only
  const lmRes: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lmRes.error) return jsonWithRes(response, { error: lmRes.error.message }, 500);
  const role = String(lmRes?.data?.role || "").toLowerCase();
  if (role !== "owner") return jsonWithRes(response, { error: "Forbidden" }, 403);

  // shallow allowlist (extend as needed)
  const allowedKeys = new Set([
    "name",
    "season",
    "ruleset",
    "max_teams",
    "settings_json",
  ]);
  const update: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (allowedKeys.has(k)) update[k] = v;
  }

  if (Object.keys(update).length === 0) {
    return jsonWithRes(response, { error: "No valid settings provided" }, 400);
  }

  const updRes: any = await (sb.from("leagues") as any)
    .update(update)
    .eq("id", leagueId)
    .select()
    .maybeSingle?.();

  if (updRes?.error) return jsonWithRes(response, { error: updRes.error.message }, 400);

  return jsonWithRes(response, { ok: true, league: updRes?.data ?? null });
}
