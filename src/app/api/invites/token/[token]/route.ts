// src/app/api/invites/token/[token]/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InviteRow = {
  id: string;
  league_id: string;
  email: string | null;
  token: string;
  is_public: boolean | null;
  accepted: boolean | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type LeagueRow = {
  id: string;
  name: string | null;
  season: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { token?: string } }
) {
  const { client: sb, response: res } = supabaseRoute(req);

  const token = String(params?.token || "").trim();
  if (!token) return jsonWithRes(res, { error: "Missing token" }, 400);

  // 1) Look up the invite by token
  const { data, error } = await sb
    .from("invites")
    .select(
      "id, league_id, email, token, is_public, accepted, revoked_at, expires_at, created_at"
    )
    .eq("token", token)
    .maybeSingle();

  const inv = (data as InviteRow | null) || null;
  if (error) return jsonWithRes(res, { error: error.message }, 400);
  if (!inv) return jsonWithRes(res, { error: "Not found" }, 404);

  // 2) Basic validity checks
  const now = new Date();
  const isRevoked = !!inv.revoked_at;
  const isExpired = !!inv.expires_at && new Date(inv.expires_at) < now;

  if (isRevoked || isExpired) {
    return jsonWithRes(
      res,
      {
        error: isRevoked ? "Invite revoked" : "Invite expired",
        revoked: isRevoked,
        expired: isExpired,
      },
      404
    );
  }

  // 3) League info for the UI
  const { data: lgData, error: lgErr } = await sb
    .from("leagues")
    .select("id, name, season")
    .eq("id", inv.league_id)
    .maybeSingle();

  const league = (lgData as LeagueRow | null) || null;
  if (lgErr) return jsonWithRes(res, { error: lgErr.message }, 400);
  if (!league) return jsonWithRes(res, { error: "League not found" }, 404);

  // 4) Return a compact payload
  return jsonWithRes(
    res,
    {
      ok: true,
      invite: {
        id: inv.id,
        league_id: inv.league_id,
        email: inv.email,
        is_public: !!inv.is_public,
        accepted: !!inv.accepted,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
      },
      league: {
        id: league.id,
        name: league.name ?? "League",
        season: league.season ?? "",
      },
    },
    200
  );
}
