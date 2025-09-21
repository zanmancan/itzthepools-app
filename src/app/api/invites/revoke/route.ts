// src/app/api/invites/revoke/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InviteRow = {
  id: string;
  league_id: string;
  accepted: boolean | null;
  revoked_at: string | null;
};

type LeagueMemberRow = { role: string | null };
type Body = { id?: string | null };

function isInviteRow(v: any): v is InviteRow {
  return v && typeof v.id === "string" && typeof v.league_id === "string";
}

function isLeagueMemberRow(v: any): v is LeagueMemberRow {
  return v && "role" in v;
}

export async function POST(req: NextRequest) {
  const { client: sb, response: res } = supabaseRoute(req);

  // auth
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(res, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(res, { error: "Unauthorized" }, 401);

  const { id }: Body = await req.json().catch(() => ({} as Body));
  if (!id) return jsonWithRes(res, { error: "Missing invite id" }, 400);

  // Invite — no generics; validate then cast
  const { data: invRaw, error: invErr } = await sb
    .from("invites")
    .select("id,league_id,accepted,revoked_at")
    .eq("id", id)
    .maybeSingle();

  if (invErr) return jsonWithRes(res, { error: invErr.message }, 400);
  if (!isInviteRow(invRaw)) return jsonWithRes(res, { error: "Invite not found" }, 404);
  const inv = invRaw as InviteRow;

  if (inv.accepted) return jsonWithRes(res, { error: "Invite already accepted" }, 409);
  if (inv.revoked_at) return jsonWithRes(res, { ok: true, alreadyRevoked: true }, 200);

  // Permission check — treat raw as any so TS doesn't produce `never`, then validate.
  const lmRes: any = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", inv.league_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lmRes.error) return jsonWithRes(res, { error: lmRes.error.message }, 500);
  const lmRaw = lmRes.data as unknown;

  if (!isLeagueMemberRow(lmRaw)) return jsonWithRes(res, { error: "Forbidden" }, 403);
  const role = String(lmRaw.role || "").toLowerCase();
  const canRevoke = role === "owner" || role === "admin";
  if (!canRevoke) return jsonWithRes(res, { error: "Forbidden" }, 403);

  // Revoke — cast this call chain to any so update payload isn't `never`
  const updRes: any = await (sb.from("invites") as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inv.id);

  if (updRes.error) return jsonWithRes(res, { error: updRes.error.message }, 400);

  return jsonWithRes(res, { ok: true }, 200);
}
