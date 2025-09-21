// src/app/api/invites/bulk-create/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/invites/bulk-create
 * Body: { leagueId: string; emails: string[]; days?: number }
 * Creates multiple **email** invites for a league (owner/admin only).
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const { leagueId, emails, days }: { leagueId?: string; emails?: string[]; days?: number } =
    await req.json().catch(() => ({} as any));

  if (!leagueId) return jsonWithRes(response, { error: "leagueId is required" }, 400);

  const list = Array.isArray(emails) ? emails.map((e) => String(e || "").trim()).filter(Boolean) : [];
  if (list.length === 0) return jsonWithRes(response, { error: "emails[] is required" }, 400);

  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  // Permission: owner/admin
  const lmRes: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (lmRes?.error) return jsonWithRes(response, { error: lmRes.error.message }, 500);

  const role = String(lmRes?.data?.role || "").toLowerCase();
  if (!(role === "owner" || role === "admin")) return jsonWithRes(response, { error: "Forbidden" }, 403);

  const now = Date.now();
  const ttlDays = Number.isFinite(days) && days! > 0 ? days! : 7;
  const expiresAt = new Date(now + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  const rows = list.map((email) => ({
    league_id: leagueId,
    email,
    token: crypto.randomUUID().replace(/-/g, ""),
    invited_by: user.id,
    accepted: false,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    revoked_at: null,
    is_public: false,
  }));

  // Insert (avoid generics; select back created rows)
  const insRes: any = await (sb.from("invites") as any).insert(rows).select();
  if (insRes?.error) return jsonWithRes(response, { error: insRes.error.message }, 400);

  return jsonWithRes(response, { ok: true, created: Array.isArray(insRes.data) ? insRes.data : [] });
}
