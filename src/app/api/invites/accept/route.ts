// src/app/api/invites/accept/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/invites/accept
 * Accepts an invite by token.
 *
 * Body or query: { token: string }
 * If you allow anonymous acceptance, remove the auth check section below.
 *
 * Notes:
 * - We call a Postgres RPC function named `accept_invite(p_token text)`.
 * - If your function has a different name, change it where noted.
 * - We cast `(sb.rpc as any)` to avoid TS generic headaches since
 *   this project doesn’t use generated Supabase DB types.
 */
export async function POST(req: NextRequest) {
  // ✅ Use supabaseRoute(req) for API routes
  const { client: sb, response } = supabaseRoute(req);

  // 1) Parse token from query or body
  const url = new URL(req.url);
  let token = url.searchParams.get("token") || "";

  if (!token) {
    const body = (await req.json().catch(() => ({} as any))) as { token?: string };
    token = (body?.token || "").trim();
  }
  if (!token) return jsonWithRes(response, { error: "token is required" }, 400);

  // 2) (Optional) Require an authenticated user
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);
  // If you want to allow anonymous acceptance, delete the 3 lines above.

  // 3) Call your RPC to accept the invite
  try {
    // ⬇️ If your function name differs, change "accept_invite" below.
    const { data, error } = await (sb.rpc as any)("accept_invite", {
      p_token: token,
    } as any);

    if (error) {
      return jsonWithRes(response, { error: error.message }, 400);
    }

    // If your RPC returns something (e.g., team_id/league_id), it's in `data`
    return jsonWithRes(response, { ok: true, data });
  } catch (e: any) {
    return jsonWithRes(
      response,
      { error: e?.message || "Unexpected error accepting invite." },
      500
    );
  }
}
