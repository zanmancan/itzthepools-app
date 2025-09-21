// src/app/api/leagues/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/leagues
 * Body: { name: string; season?: string; ruleset?: string; is_public?: boolean }
 *
 * Creates a league and sets the current user as OWNER.
 * Notes:
 * - No Supabase generics (avoids `never` types in strict TS)
 * - Clear validation & error messages
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  // Auth
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  // Parse + validate
  const body = (await req.json().catch(() => ({} as any))) as {
    name?: string;
    season?: string;
    ruleset?: string;
    is_public?: boolean;
  };

  const name = String(body?.name || "").trim();
  if (!name) return jsonWithRes(response, { error: "name is required" }, 400);

  const season = String(body?.season || "").trim() || new Date().getFullYear().toString();
  const ruleset = body?.ruleset ? String(body.ruleset) : null;
  const is_public = Boolean(body?.is_public);

  // Insert league (avoid generics; cast only at call edge)
  const leagueRow = {
    name,
    season,
    ruleset,
    is_public,
    created_at: new Date().toISOString(),
    created_by: user.id,
  };

  const insLeague: any = await (sb.from("leagues") as any)
    .insert(leagueRow)
    .select("id, name, season, ruleset, is_public")
    .maybeSingle?.();

  if (insLeague?.error) return jsonWithRes(response, { error: insLeague.error.message }, 400);

  const league = insLeague?.data;
  if (!league?.id) return jsonWithRes(response, { error: "Failed to create league" }, 500);

  // Ensure owner membership exists
  const insMember: any = await (sb.from("league_members") as any)
    .insert({
      league_id: league.id,
      user_id: user.id,
      role: "owner",
      created_at: new Date().toISOString(),
    })
    .select("league_id, user_id, role")
    .maybeSingle?.();

  if (insMember?.error) {
    // best-effort cleanup if membership failed
    await (sb.from("leagues") as any).delete().eq("id", league.id);
    return jsonWithRes(response, { error: insMember.error.message }, 400);
  }

  return jsonWithRes(response, { ok: true, league });
}

/**
 * GET /api/leagues
 * Returns the leagues for the current user with their role.
 */
export async function GET(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message, leagues: [] }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized", leagues: [] }, 401);

  const q: any = await sb
    .from("league_members")
    .select("role, leagues:league_id(id, name, season, ruleset, is_public)")
    .eq("user_id", user.id);

  if (q?.error) return jsonWithRes(response, { error: q.error.message, leagues: [] }, 400);

  const rows = Array.isArray(q.data) ? q.data : [];
  const leagues = rows
    .map((r: any) => ({
      id: r?.leagues?.id,
      name: r?.leagues?.name,
      season: r?.leagues?.season,
      ruleset: r?.leagues?.ruleset ?? null,
      is_public: !!r?.leagues?.is_public,
      role: String(r?.role || "member").toLowerCase(),
    }))
    .filter((x: any) => x.id);

  // Sort for a stable UI
  leagues.sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));

  return jsonWithRes(response, { ok: true, leagues });
}
