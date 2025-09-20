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
    /* ignore parse error – maybe query has it */
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

  // 3) Load invite row (RLS must allow: is_public OR email = auth.email())
  const { data: invite, error: selErr } = await client
    .from("invites")
    .select("id, league_id, email, is_public")
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

  // 4) Email-locked invites must match the signed-in user's email
  if (!invite.is_public) {
    const inviteEmail = String(invite.email || "").toLowerCase();
    const userEmail = String(user.email || "").toLowerCase();
    if (!inviteEmail || inviteEmail !== userEmail) {
      return jsonWithRes(
        response,
        { error: "This invite is not for your email address." },
        403
      );
    }
  }

  // 5) Add membership (idempotent)
  //    Some supabase-js type bundles expect arrays for upsert() – pass [payload]
  const memberPayload = {
    league_id: String(invite.league_id),
    user_id: user.id,
    role: "member" as const,
  };

  const { error: upErr } = await client
    .from("league_members")
    .upsert([memberPayload], {
      // Keep this minimal for maximum version compatibility
      onConflict: "league_id,user_id",
      // leaving out ignoreDuplicates/returning to avoid overload mismatches
    });

  if (upErr) {
    return jsonWithRes(
      response,
      { error: "Failed to create membership.", detail: upErr.message },
      500
    );
  }

  // 6) Consume the invite (best-effort)
  await client.from("invites").delete().eq("id", invite.id);

  return jsonWithRes(response, { ok: true, league_id: invite.league_id }, 200);
}
