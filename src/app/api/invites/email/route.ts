// src/app/api/invites/email/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/invites/email
 * Body: { leagueId: string; email: string; days?: number }
 * Creates an **email** invite row. (If you also send emails via RPC, add it after insert.)
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  const { leagueId, email: rawEmail, days }: { leagueId?: string; email?: string; days?: number } =
    await req.json().catch(() => ({} as any));

  if (!leagueId) return jsonWithRes(response, { error: "leagueId is required" }, 400);
  const email = (rawEmail || "").trim();
  if (!email) return jsonWithRes(response, { error: "email is required" }, 400);

  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  const perm: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (perm?.error) return jsonWithRes(response, { error: perm.error.message }, 500);
  const role = String(perm?.data?.role || "").toLowerCase();
  if (!(role === "owner" || role === "admin")) return jsonWithRes(response, { error: "Forbidden" }, 403);

  const ttlDays = Number.isFinite(days) && days! > 0 ? days! : 7;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  const row = {
    league_id: leagueId,
    email,
    token: crypto.randomUUID().replace(/-/g, ""),
    invited_by: user.id,
    accepted: false,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    revoked_at: null,
    is_public: false,
  };

  const insRes: any = await (sb.from("invites") as any).insert(row).select().maybeSingle?.();
  if (insRes?.error) return jsonWithRes(response, { error: insRes.error.message }, 400);

  // If you have an RPC that sends the email, you can call it here:
  // await (sb.rpc as any)("send_invite_email", { p_league_id: leagueId, p_email: email, p_token: row.token } as any);

  return jsonWithRes(response, { ok: true, invite: insRes?.data ?? null });
}
