// src/app/api/invites/accept/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { token?: string | null };

export async function POST(req: NextRequest) {
  const { client, response } = supabaseServer(req);

  // 1) token from body or query
  let token = "";
  try {
    const body = (await req.json()) as Body;
    if (typeof body?.token === "string") token = body.token.trim();
  } catch {
    /* ignore; might be in the query */
  }
  if (!token) {
    const q = new URL(req.url).searchParams.get("token");
    if (q) token = q.trim();
  }
  if (!token) return jsonWithRes(response, { error: "token is required" }, 400);

  // 2) Must be signed in
  const {
    data: { user },
    error: userErr,
  } = await client.auth.getUser();
  if (userErr || !user) return jsonWithRes(response, { error: "Not authenticated." }, 401);

  // 3) Mark invite accepted in a single statement and RETURN league_id
  //    (avoids needing separate SELECT policy)
  const { data: updated, error: updErr } = await client
    .from("invites")
    .update({ accepted: true })
    .eq("token", token)
    .eq("accepted", false)
    .select("id, league_id, email")
    .maybeSingle();

  if (updErr) {
    return jsonWithRes(
      response,
      { error: "Failed to accept invite.", detail: updErr.message },
      500
    );
  }
  if (!updated) {
    // Either wrong token, already accepted, or not authorized by RLS
    return jsonWithRes(
      response,
      { error: "Invite not found or not accessible." },
      404
    );
  }

  // 4) If the invite had an email lock, ensure it matches the current user
  const inviteEmail = String(updated.email || "").toLowerCase();
  const userEmail = String(user.email || "").toLowerCase();
  if (inviteEmail && inviteEmail !== userEmail) {
    return jsonWithRes(
      response,
      { error: "This invite is not for your email address." },
      403
    );
  }

  // 5) Add membership (idempotent)
  const member = {
    league_id: String(updated.league_id),
    user_id: user.id,
    role: "member" as const,
  };

  const { error: upErr } = await client
    .from("league_members")
    .upsert([member], { onConflict: "league_id,user_id" });

  if (upErr) {
    return jsonWithRes(
      response,
      { error: "Failed to create membership.", detail: upErr.message },
      500
    );
  }

  return jsonWithRes(response, { ok: true, league_id: updated.league_id }, 200);
}
