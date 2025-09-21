// src/app/api/leagues/[id]/invites/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  const { client: sb, response: res } = supabaseRoute(req);
  const leagueId = params.id;

  // Auth
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(res, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(res, { error: "Unauthorized" }, 401);

  // Owner/admin check
  const { data: lm, error: lmErr } = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (lmErr) return jsonWithRes(res, { error: lmErr.message }, 500);

  const isOwnerOrAdmin =
    lm && ["owner", "admin"].includes(String(lm.role || "").toLowerCase());
  if (!isOwnerOrAdmin) return jsonWithRes(res, { error: "Forbidden" }, 403);

  // Fetch once, bucket on the server
  const nowIso = new Date().toISOString();
  const columns =
    "id, email, token, created_at, expires_at, accepted, revoked_at";

  const { data, error } = await sb
    .from("invites")
    .select(columns)
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false });

  if (error) return jsonWithRes(res, { error: error.message }, 400);

  const list = Array.isArray(data) ? data : [];

  // Buckets:
  // - open: not accepted, not revoked, not expired
  // - accepted: accepted = true
  // - revoked: revoked_at is set OR (not accepted and expired/missing expires)
  const open = list.filter(
    (i) =>
      !i.accepted &&
      !i.revoked_at &&
      i.expires_at &&
      String(i.expires_at) > nowIso
  );

  const accepted = list.filter((i) => !!i.accepted);

  const revoked = list.filter(
    (i) =>
      (!!i.revoked_at ||
        !i.expires_at ||
        String(i.expires_at) <= nowIso) &&
      !i.accepted
  );

  // Always return arrays
  return jsonWithRes(res, {
    ok: true,
    open,
    accepted,
    revoked,
  });
}
