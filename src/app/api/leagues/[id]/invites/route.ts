// src/app/api/leagues/[id]/invites/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/leagues/:id/invites
 * Returns { open, accepted, denied } buckets. Owner/admin only.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { client: sb, response } = supabaseRoute(req);
  const leagueId = params?.id;

  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message, open: [], accepted: [], denied: [] }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized", open: [], accepted: [], denied: [] }, 401);

  const lmRes: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lmRes.error) return jsonWithRes(response, { error: lmRes.error.message, open: [], accepted: [], denied: [] }, 500);
  const role = String(lmRes?.data?.role || "").toLowerCase();
  const can = role === "owner" || role === "admin";
  if (!can) return jsonWithRes(response, { error: "Forbidden", open: [], accepted: [], denied: [] }, 403);

  const resInv: any = await sb
    .from("invites")
    .select("id,league_id,email,token,created_at,expires_at,accepted,accepted_at,revoked_at,is_public")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false });

  if (resInv.error) return jsonWithRes(response, { error: resInv.error.message, open: [], accepted: [], denied: [] }, 400);

  const list: any[] = Array.isArray(resInv.data) ? resInv.data : [];
  const nowIso = new Date().toISOString();

  const isAccepted = (i: any) => Boolean(i?.accepted) || Boolean(i?.accepted_at);
  const isRevoked  = (i: any) => Boolean(i?.revoked_at);
  const hasExpiry  = (i: any) => Boolean(i?.expires_at);
  const isExpired  = (i: any) => {
    const ex = i?.expires_at ? String(i.expires_at) : "";
    return !ex || ex <= nowIso;
  };

  const open     = list.filter((i) => !isAccepted(i) && !isRevoked(i) && hasExpiry(i) && !isExpired(i));
  const accepted = list.filter((i) => isAccepted(i));
  const denied   = list.filter((i) => !isAccepted(i) && (isRevoked(i) || isExpired(i)));

  return jsonWithRes(response, { ok: true, open, accepted, denied });
}
