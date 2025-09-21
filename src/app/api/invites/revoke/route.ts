// src/app/api/invites/revoke/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";
import { devlog, deverror } from "@/lib/devlog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { id?: string | null; token?: string | null; reason?: string | null };

export async function POST(req: NextRequest) {
  const { client: sb, response: res } = supabaseServer(req);

  // Auth
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr || !user) return jsonWithRes(res, { error: "Not authenticated." }, 401);

  // Parse
  let id: string | undefined, token: string | undefined, reason: string | null = null;
  try {
    const body = (await req.json()) as Body;
    id = typeof body?.id === "string" ? body.id.trim() : undefined;
    token = typeof body?.token === "string" ? body.token.trim() : undefined;
    reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 180) : null;
  } catch { /* ignore */ }

  if (!id && !token) {
    return jsonWithRes(res, { error: "id or token is required." }, 400);
  }

  // Load invite
  const sel = sb
    .from("invites")
    .select("id, league_id, invited_by, accepted, revoked_at")
    .limit(1);

  const query = id ? sel.eq("id", id) : sel.eq("token", token!);
  const { data: inv, error: selErr } = await query.maybeSingle();

  if (selErr) {
    deverror("[invite:revoke] load failed", selErr);
    return jsonWithRes(res, { error: "Failed to load invite." }, 500);
  }
  if (!inv) return jsonWithRes(res, { error: "Invite not found." }, 404);

  if (inv.accepted) {
    return jsonWithRes(res, { error: "Invite already accepted." }, 409);
  }
  if (inv.revoked_at) {
    return jsonWithRes(res, { ok: true, alreadyRevoked: true }, 200);
  }

  // Permission: owner/admin of the league OR the original inviter
  const { data: lm } = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", inv.league_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const canRevoke =
    (lm && ["owner", "admin"].includes(lm.role as any)) ||
    inv.invited_by === user.id;

  if (!canRevoke) {
    return jsonWithRes(res, { error: "Forbidden" }, 403);
  }

  // Revoke
  const now = new Date().toISOString();
  const { error: updErr } = await sb
    .from("invites")
    .update({ revoked_at: now, revoked_by: user.id, revoked_reason: reason })
    .eq("id", inv.id)
    .is("revoked_at", null)
    .eq("accepted", false);

  if (updErr) {
    deverror("[invite:revoke] update failed", updErr, { invite_id: inv.id });
    return jsonWithRes(res, { error: "Failed to revoke invite." }, 500);
  }

  devlog("[invite:revoke] success", { invite_id: inv.id, reason });
  return jsonWithRes(res, { ok: true, revoked_at: now });
}
