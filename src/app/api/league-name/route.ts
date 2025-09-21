// src/app/api/league-name/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/league-name
 * Body: { leagueId: string, name: string }
 * Renames a league (owner/admin only).
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const { leagueId, name }: { leagueId?: string; name?: string } = await req.json().catch(() => ({} as any));
  if (!leagueId) return jsonWithRes(response, { error: "leagueId is required" }, 400);
  const clean = String(name || "").trim();
  if (!clean) return jsonWithRes(response, { error: "name is required" }, 400);

  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  const lmRes: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lmRes.error) return jsonWithRes(response, { error: lmRes.error.message }, 500);
  const role = String(lmRes?.data?.role || "").toLowerCase();
  if (!(role === "owner" || role === "admin")) return jsonWithRes(response, { error: "Forbidden" }, 403);

  const upd: any = await (sb.from("leagues") as any)
    .update({ name: clean })
    .eq("id", leagueId)
    .select()
    .maybeSingle?.();

  if (upd?.error) return jsonWithRes(response, { error: upd.error.message }, 400);

  return jsonWithRes(response, { ok: true, league: upd?.data ?? null });
}
