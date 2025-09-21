import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  const { client: sb, response: res } = supabaseRoute(req);
  const leagueId = params.id;

  // auth
  const { data: { user }, error: uerr } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(res, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(res, { error: "Unauthorized" }, 401);

  // owner/admin check
  const { data: lm } = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();
  const isOwnerOrAdmin = lm && ["owner", "admin"].includes(String(lm.role));
  if (!isOwnerOrAdmin) return jsonWithRes(res, { error: "Forbidden" }, 403);

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "open";

  let q = sb
    .from("invites")
    .select("id, email, token, created_at, expires_at, accepted, revoked_at")
    .eq("league_id", leagueId);

  if (status === "open") {
    q = q
      .eq("accepted", false)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString());
  }

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return jsonWithRes(res, { error: error.message }, 400);

  return jsonWithRes(res, { ok: true, invites: data ?? [] });
}
