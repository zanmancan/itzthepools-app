// src/app/api/invites/revoke/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/invites/revoke
 * Body: { id?: string; token?: string }
 *
 * Revokes a pending invite by setting revoked_at = now().
 * Permissions: league owner/admin OR inviter, and invite must not be accepted.
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  // Parse body
  const body = (await req.json().catch(() => ({} as any))) as {
    id?: string;
    token?: string;
  };

  const id = (body.id || "").trim();
  const token = (body.token || "").trim();

  if (!id && !token) {
    return jsonWithRes(response, { error: "id or token is required" }, 400);
  }

  // Auth
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  // Load invite (by id or token)
  const invRes: any = await sb
    .from("invites")
    .select(
      "id, league_id, invited_by, accepted, accepted_at, revoked_at, is_public"
    )
    .or(id ? `id.eq.${id}` : `token.eq.${token}`)
    .maybeSingle();

  if (invRes?.error) return jsonWithRes(response, { error: invRes.error.message }, 400);
  const inv = invRes?.data;
  if (!inv) return jsonWithRes(response, { error: "Invite not found" }, 404);

  // Already accepted?
  if (inv.accepted || inv.accepted_at) {
    return jsonWithRes(response, { error: "Invite already accepted" }, 409);
  }

  // Permission: owner/admin of league OR original inviter
  const lmRes: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", inv.league_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lmRes?.error) return jsonWithRes(response, { error: lmRes.error.message }, 500);
  const role = String(lmRes?.data?.role || "").toLowerCase();
  const canRevoke = role === "owner" || role === "admin" || inv.invited_by === user.id;
  if (!canRevoke) return jsonWithRes(response, { error: "Forbidden" }, 403);

  // If already revoked, treat as success (idempotent UX)
  if (inv.revoked_at) return jsonWithRes(response, { ok: true, alreadyRevoked: true });

  // Update: set revoked_at = now()
  const nowIso = new Date().toISOString();
  const updRes: any = await (sb.from("invites") as any)
    .update({ revoked_at: nowIso })
    .eq("id", inv.id)
    .select("id, revoked_at")
    .maybeSingle?.();

  if (updRes?.error) return jsonWithRes(response, { error: updRes.error.message }, 400);

  return jsonWithRes(response, { ok: true, id: inv.id, revoked_at: updRes?.data?.revoked_at || nowIso });
}
