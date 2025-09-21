// src/app/api/invites/list/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invites/list?leagueId=...
 * - Auth required
 * - Must be owner/admin of the league
 * - Returns buckets: { open, accepted, denied } — always arrays
 *
 * We avoid Supabase generics (your project doesn't use generated DB types),
 * and add small runtime guards so strict TS won't infer `never`.
 */

type LeagueMemberRow = { role: string | null };

function isLeagueMemberRow(v: any): v is LeagueMemberRow {
  return v && "role" in v;
}

export async function GET(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const url = new URL(req.url);
  const leagueId = url.searchParams.get("leagueId");

  // Auth
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message, open: [], accepted: [], denied: [] }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized", open: [], accepted: [], denied: [] }, 401);

  if (!leagueId) {
    return jsonWithRes(response, { error: "leagueId is required", open: [], accepted: [], denied: [] }, 400);
  }

  // Permission: must be owner/admin on this league
  const lmRes: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lmRes.error) {
    return jsonWithRes(response, { error: lmRes.error.message, open: [], accepted: [], denied: [] }, 500);
  }

  const lmRaw = lmRes.data as unknown;
  if (!isLeagueMemberRow(lmRaw)) {
    return jsonWithRes(response, { error: "Forbidden", open: [], accepted: [], denied: [] }, 403);
  }
  const role = String(lmRaw.role || "").toLowerCase();
  const canManage = role === "owner" || role === "admin";
  if (!canManage) {
    return jsonWithRes(response, { error: "Forbidden", open: [], accepted: [], denied: [] }, 403);
  }

  // Fetch invites (no generics)
  const invRes: any = await sb
    .from("invites")
    .select(
      "id, league_id, email, token, created_at, expires_at, accepted, accepted_at, revoked_at, is_public"
    )
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false });

  if (invRes.error) {
    return jsonWithRes(response, { error: invRes.error.message, open: [], accepted: [], denied: [] }, 400);
  }

  const list: any[] = Array.isArray(invRes.data) ? (invRes.data as any[]) : [];
  const nowIso = new Date().toISOString();

  // Helpers (avoid TS property errors by reading via any)
  const isAccepted = (i: any) => Boolean(i?.accepted) || Boolean(i?.accepted_at);
  const isRevoked = (i: any) => Boolean(i?.revoked_at);
  const hasExpiry = (i: any) => Boolean(i?.expires_at);
  const isExpired = (i: any) => {
    const ex = i?.expires_at ? String(i.expires_at) : "";
    return !ex || ex <= nowIso;
  };

  const open = list.filter(
    (i) => !isAccepted(i) && !isRevoked(i) && hasExpiry(i) && !isExpired(i)
  );
  const accepted = list.filter((i) => isAccepted(i));
  const denied = list.filter((i) => !isAccepted(i) && (isRevoked(i) || isExpired(i)));

  return jsonWithRes(response, { ok: true, open, accepted, denied });
}
