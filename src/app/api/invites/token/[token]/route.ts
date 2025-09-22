// src/app/api/invites/token/[token]/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes, createSbServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { token?: string } }
) {
  // We still use supabaseRoute to preserve any auth cookies on the response,
  // but the actual DB call uses a SECURITY DEFINER RPC so anon can execute it.
  const { response: res } = supabaseRoute(req);
  const sb = createSbServer();

  const token = String(params?.token || "").trim();
  if (!token) return jsonWithRes(res, { error: "Missing token" }, 400);

  const { data, error } = await sb.rpc("get_invite_and_league", { p_token: token });

  if (error) return jsonWithRes(res, { error: error.message }, 500);
  if (!data || data.length === 0) return jsonWithRes(res, { error: "Not found" }, 404);

  const row = data[0];
  const now = new Date();
  const revoked = !!row.revoked_at;
  const expired = row.expires_at ? new Date(row.expires_at) < now : false;

  if (revoked || expired) {
    return jsonWithRes(
      res,
      { error: revoked ? "Invite revoked" : "Invite expired", revoked, expired },
      404
    );
  }

  return jsonWithRes(
    res,
    {
      ok: true,
      invite: {
        id: row.invite_id,
        league_id: row.league_id,
        email: row.invite_email,
        is_public: !!row.is_public,
        accepted: !!row.accepted,
        expires_at: row.expires_at,
        created_at: row.created_at,
      },
      league: {
        id: row.league_id,
        name: row.league_name ?? "League",
        season: row.league_season ?? "",
      },
    },
    200
  );
}
