// src/app/api/invites/accept/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { token?: string | null };

export async function POST(req: NextRequest) {
  const { client, response } = supabaseServer(req);

  // Token from body or query
  let token = "";
  try {
    const body = (await req.json()) as Body;
    if (typeof body?.token === "string") token = body.token.trim();
  } catch {
    /* ignore; might be in query */
  }
  if (!token) {
    const q = new URL(req.url).searchParams.get("token");
    if (q) token = q.trim();
  }
  if (!token) return jsonWithRes(response, { error: "token is required" }, 400);

  // Must be signed in
  const {
    data: { user },
    error: userErr,
  } = await client.auth.getUser();
  if (userErr || !user) return jsonWithRes(response, { error: "Not authenticated." }, 401);

  // Load invite (RLS: accepted=false AND (email is null OR email=auth.email()))
  const { data: invite, error: selErr } = await client
    .from("invites")
    .select("id, league_id, email, accepted")
    .eq("token", token)
    .maybeSingle();

  if (selErr) {
    return jsonWithRes(
      response,
      { error: "Failed to load invite.", detail: selErr.message },
      500
    );
  }
  if (!invite) return jsonWithRes(response, { error: "Invite not found." }, 404);
  if (invite.accepted) return jsonWithRes(response, { error: "Invite already used." }, 409);

  // If email-locked, enforce match
  const inviteEmail = String(invite.email || "").toLowerCase();
  if (inviteEmail && inviteEmail !== String(user.email || "").toLowerCase()) {
    return jsonWithRes(
      response,
      { error: "This invite is not for your email address." },
      403
    );
  }

  // Use RPC: inserts membership (idempotent) and marks invite accepted
  const { data: leagueId, error: rpcErr } = await client.rpc("accept_invite", { p_token: token });
  if (rpcErr) {
    return jsonWithRes(
      response,
      { error: "Failed to accept invite.", detail: rpcErr.message },
      500
    );
  }

  return jsonWithRes(response, { ok: true, league_id: leagueId || invite.league_id }, 200);
}
