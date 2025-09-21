// src/app/api/invites/id/[id]/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// IMPORTANT: this folder is .../id/[id]/ so the param is "id"
type Params = { params: { id: string } };

/** GET /api/invites/id/:id — fetch a single invite (owner/admin or inviter can view) */
export async function GET(req: NextRequest, { params }: Params) {
  const { client: sb, response } = supabaseRoute(req);

  // Auth
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  // Load invite (avoid generics; use `any` result)
  const invRes: any = await sb
    .from("invites")
    .select(
      "id, league_id, email, invited_by, token, accepted, accepted_at, created_at, expires_at, revoked_at, is_public"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (invRes?.error) return jsonWithRes(response, { error: invRes.error.message }, 400);
  const inv = invRes?.data;
  if (!inv) return jsonWithRes(response, { error: "Invite not found" }, 404);

  // Permission: owner/admin of league OR the original inviter
  const lmRes: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", inv.league_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lmRes?.error) return jsonWithRes(response, { error: lmRes.error.message }, 500);

  const role = String(lmRes?.data?.role || "").toLowerCase();
  const canView = role === "owner" || role === "admin" || inv.invited_by === user.id;
  if (!canView) return jsonWithRes(response, { error: "Forbidden" }, 403);

  return jsonWithRes(response, { ok: true, invite: inv });
}

/** DELETE /api/invites/id/:id — delete an invite (owner/admin or inviter, if not accepted) */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { client: sb, response } = supabaseRoute(req);

  // Auth
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  // Load invite first to check permissions
  const invRes: any = await sb
    .from("invites")
    .select("id, league_id, invited_by, accepted, accepted_at, revoked_at")
    .eq("id", params.id)
    .maybeSingle();

  if (invRes?.error) return jsonWithRes(response, { error: invRes.error.message }, 400);
  const inv = invRes?.data;
  if (!inv) return jsonWithRes(response, { error: "Invite not found" }, 404);
  if (inv.accepted || inv.accepted_at) {
    return jsonWithRes(response, { error: "Invite already used" }, 409);
  }

  // Permission: owner/admin of league OR the inviter
  const lmRes: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", inv.league_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lmRes?.error) return jsonWithRes(response, { error: lmRes.error.message }, 500);

  const role = String(lmRes?.data?.role || "").toLowerCase();
  const canDelete = role === "owner" || role === "admin" || inv.invited_by === user.id;
  if (!canDelete) return jsonWithRes(response, { error: "Forbidden" }, 403);

  // Delete (avoid generics)
  const delRes: any = await (sb.from("invites") as any).delete().eq("id", params.id);
  if (delRes?.error) return jsonWithRes(response, { error: delRes.error.message }, 400);

  return jsonWithRes(response, { ok: true });
}
