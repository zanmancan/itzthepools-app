// src/app/api/invites/token/[token]/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes, supabaseService } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// We purposely use the service-role client to bypass RLS for this very narrow, server-only read.
// We still return only minimal, non-sensitive fields.
export async function GET(
  req: NextRequest,
  { params }: { params: { token?: string } }
) {
  // We still create a response via supabaseRoute so any auth cookies on the request are preserved on the way out
  const { response: res } = supabaseRoute(req);
  const sb = supabaseService();

  const token = String(params?.token || "").trim();
  if (!token) return jsonWithRes(res, { error: "Missing token" }, 400);

  // 1) Invite lookup by token
  const { data: inv, error } = await sb
    .from("invites")
    .select(
      "id, league_id, email, token, is_public, accepted, revoked_at, expires_at, created_at"
    )
    .eq("token", token)
    .maybeSingle();

  if (error) return jsonWithRes(res, { error: error.message }, 400);
  if (!inv) return jsonWithRes(res, { error: "Not found" }, 404);

  // 2) Validity checks
  const now = new Date();
  const revoked = !!inv.revoked_at;
  const expired = !!inv.expires_at && new Date(inv.expires_at) < now;
  if (revoked || expired) {
    return jsonWithRes(
      res,
      { error: revoked ? "Invite revoked" : "Invite expired", revoked, expired },
      404
    );
  }

  // 3) Minimal league info for the UI
  const { data: lg, error: lgErr } = await sb
    .from("leagues")
    .select("id, name, season")
    .eq("id", inv.league_id)
    .maybeSingle();

  if (lgErr) return jsonWithRes(res, { error: lgErr.message }, 400);
  if (!lg) return jsonWithRes(res, { error: "League not found" }, 404);

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
        id: lg.id,
        name: lg.name ?? "League",
        season: lg.season ?? "",
      },
    },
    200
  );
}
