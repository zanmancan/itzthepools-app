// src/app/api/invites/create/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/invites/create
 * Body: { leagueId: string; email?: string; public?: boolean; days?: number }
 * - email provided  -> email invite
 * - public === true -> public link invite (no email)
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const {
    leagueId,
    email: rawEmail,
    public: asPublic,
    days,
  }: { leagueId?: string; email?: string; public?: boolean; days?: number } = await req
    .json()
    .catch(() => ({} as any));

  if (!leagueId) return jsonWithRes(response, { error: "leagueId is required" }, 400);

  const email = (rawEmail || "").trim();
  const isPublic = Boolean(asPublic);

  if (!isPublic && !email) return jsonWithRes(response, { error: "Provide email or set public=true" }, 400);

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
  if (lmRes?.error) return jsonWithRes(response, { error: lmRes.error.message }, 500);

  const role = String(lmRes?.data?.role || "").toLowerCase();
  if (!(role === "owner" || role === "admin")) return jsonWithRes(response, { error: "Forbidden" }, 403);

  const ttlDays = Number.isFinite(days) && days! > 0 ? days! : 7;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  const row = {
    league_id: leagueId,
    email: isPublic ? null : email,
    token: crypto.randomUUID().replace(/-/g, ""),
    invited_by: user.id,
    accepted: false,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    revoked_at: null,
    is_public: isPublic,
  };

  const insRes: any = await (sb.from("invites") as any).insert(row).select().maybeSingle?.();
  if (insRes?.error) return jsonWithRes(response, { error: insRes.error.message }, 400);

  return jsonWithRes(response, { ok: true, invite: insRes?.data ?? null });
}
