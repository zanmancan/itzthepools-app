// src/app/api/invites/info/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Narrow types used for shaping the response */
type LeagueSlim = {
  id: string;
  name: string | null;
  season: string | null;
};

type InviteSelectRow = {
  id: string;
  email: string | null;
  is_public: boolean | null;
  expires_at: string | null;
  league_id: string;
  leagues?: LeagueSlim | null;
};

export async function GET(req: NextRequest) {
  const { client: sb, response: res } = supabaseRoute(req);
  const token = req.nextUrl.searchParams.get("token");

  if (!token) return jsonWithRes(res, { error: "Missing token" }, 400);

  // NOTE: Supabase `.select()` does not take a TS generic.
  // We fetch loosely, then assert to our narrow shape.
  const { data, error } = await sb
    .from("invites")
    .select(`
      id,
      email,
      is_public,
      expires_at,
      league_id,
      leagues:league_id ( id, name, season )
    `)
    .eq("token", token)
    .maybeSingle();

  if (error) return jsonWithRes(res, { error: error.message }, 500);
  if (!data) return jsonWithRes(res, { error: "Invite not found" }, 404);

  // Safe cast to our shape (runtime fields are controlled by the select above)
  const row = data as unknown as InviteSelectRow;

  const invite = {
    id: row.id,
    email: row.email,
    is_public: row.is_public,
    expires_at: row.expires_at,
    league_id: row.league_id,
    league_name: row.leagues?.name ?? null,
    league_season: row.leagues?.season ?? null,
  };

  return jsonWithRes(res, { invite }, 200);
}
