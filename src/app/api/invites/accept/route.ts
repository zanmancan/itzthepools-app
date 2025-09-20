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

  // 3) Accept invite with a single UPDATE ... RETURNING (works with only an UPDATE policy)
  const { data: inv, error: updErr } = await client
    .from("invites")
    .update({ accepted: true })
    .eq("token", token)
    .eq("accepted", false)
    .select("league_id, email")
    .maybeSingle();

  if (updErr) {
    return jsonWithRes(
      response,
      { error: "Failed to accept invite (update).", code: updErr.code, detail: updErr.message },
      500
    );
  }
  if (!inv) {
    return jsonWithRes(
      response,
      { error: "Invite not found, already used, or not accessible." },
      404
    );
  }

  // 4) If email-locked, enforce match
  const inviteEmail = String(inv.email ?? "").toLowerCase();
  const userEmail = String(user.email ?? "").toLowerCase();
  if (inviteEmail && inviteEmail !== userEmail) {
    return jsonWithRes(
      response,
      { error: "This invite is not for your email address." },
      403
    );
  }

  // 5) Idempotent membership: SELECT first, INSERT only if missing
  const { data: existing, error: existErr } = await client
    .from("league_members")
    .select("user_id") // minimal column to avoid schema mismatch
    .eq("league_id", inv.league_id as any)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existErr) {
    return jsonWithRes(
      response,
      { error: "Failed to check membership.", code: existErr.code, detail: existErr.message },
      500
    );
  }

  if (!existing) {
    const memberPayload = {
      league_id: String(inv.league_id),
      user_id: user.id,
      role: "member" as const,
    };

    const { error: insErr } = await client.from("league_members").insert([memberPayload]);

    if (insErr) {
      // If it somehow raced and hit a duplicate, treat as success; otherwise bubble the error
      const isDuplicate = insErr.code === "23505";
      if (!isDuplicate) {
        return jsonWithRes(
          response,
          { error: "Failed to create membership.", code: insErr.code, detail: insErr.message },
          500
        );
      }
    }
  }

  return jsonWithRes(response, { ok: true, league_id: inv.league_id }, 200);
}
