// src/app/api/invites/accept-with-name/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/invites/accept-with-name
 * Body: { token: string; teamName: string }
 *
 * Calls the Postgres RPC function `accept_invite_with_name(p_token text, p_team_name text)`
 * to atomically accept the invite and set the team name.
 *
 * Notes:
 * - We avoid Supabase generics (no generated DB types in this project).
 * - We cast the RPC params as `any` so TS doesn’t force the second arg to `undefined`.
 * - Uses supabaseRoute(req) so auth cookies are forwarded correctly.
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  // Parse & validate payload
  const { token, teamName }: { token?: string; teamName?: string } = await req
    .json()
    .catch(() => ({} as any));

  if (!token || typeof token !== "string") {
    return jsonWithRes(response, { error: "token is required" }, 400);
  }
  const cleanTeam = String(teamName || "").trim();
  if (!cleanTeam) {
    return jsonWithRes(response, { error: "teamName is required" }, 400);
  }

  // Ensure we have a session (some installs let anonymous accept; if that’s your intent, remove this block)
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  // Call RPC (cast params to any to avoid TS “undefined” second arg)
  try {
    const { data, error } = await (sb.rpc as any)("accept_invite_with_name", {
      p_token: token,
      p_team_name: cleanTeam,
    } as any);

    if (error) {
      // Common SQL/RLS errors get bubbled up here
      return jsonWithRes(response, { error: error.message }, 400);
    }

    // If your RPC returns something specific (e.g., team_id, league_id), it will be in `data`
    return jsonWithRes(response, { ok: true, data });
  } catch (e: any) {
    return jsonWithRes(
      response,
      { error: e?.message || "Unexpected error calling accept_invite_with_name." },
      500
    );
  }
}
