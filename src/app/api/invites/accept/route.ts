// src/app/api/invites/accept/route.ts
// Accepts an invite by token with strong guards and schema flexibility.
// Supports both legacy (accepted boolean) and modern (accepted_at/accepted_by) columns.
// Also enforces expiry, verified email, private-invite email matching, and idempotent reuse.

import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";
import { devlog } from "@/lib/devlog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { token?: string | null; teamName?: string | null };

function normalizeTeamName(n?: string | null) {
  const v = (n ?? "").trim();
  if (!v) return null;
  if (v.length < 2 || v.length > 30) return null;
  if (!/^[A-Za-z0-9 _-]+$/.test(v)) return null;
  return v;
}

function isUnknownColumn(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}

export async function POST(req: NextRequest) {
  const { client, response } = supabaseServer(req);

  // 1) Parse token + optional team name (JSON body preferred, query fallback)
  let token = "";
  let teamNameIn: string | null | undefined;
  try {
    const body = (await req.json()) as Body;
    token = typeof body?.token === "string" ? body.token.trim() : "";
    teamNameIn = typeof body?.teamName === "string" ? body.teamName : undefined;
  } catch {
    /* ignore invalid JSON */
  }
  if (!token) {
    const q = new URL(req.url).searchParams.get("token");
    if (q) token = q.trim();
  }
  if (!token) return jsonWithRes(response, { ok: false, error: "token is required" }, 400);

  // 2) Require auth + verified email
  const { data: auth, error: userErr } = await client.auth.getUser();
  const user = auth?.user;
  if (userErr || !user) return jsonWithRes(response, { ok: false, error: "Not authenticated." }, 401);
  if (!user.email_confirmed_at) {
    return jsonWithRes(response, { ok: false, error: "Please verify your email to continue." }, 401);
  }

  // 3) Load invite (wide selection works across schemas)
  const { data: invite, error: loadErr } = await client
    .from("invites")
    .select("id, token, league_id, email, is_public, expires_at, accepted, accepted_at, accepted_by")
    .eq("token", token)
    .maybeSingle();

  if (loadErr) {
    return jsonWithRes(
      response,
      { ok: false, error: "Failed to load invite.", code: loadErr.code, detail: loadErr.message },
      500
    );
  }
  if (!invite) return jsonWithRes(response, { ok: false, error: "Invite not found." }, 404);

  // 4) Expired?
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return jsonWithRes(response, { ok: false, error: "Invite expired." }, 410);
  }

  // 5) Private-invite guard
  const isPublic = Boolean(invite.is_public);
  const inviteEmail = String(invite.email ?? "").trim().toLowerCase();
  const userEmail = String(user.email ?? "").trim().toLowerCase();
  if (!isPublic) {
    if (!inviteEmail) {
      return jsonWithRes(
        response,
        { ok: false, error: "This invite is private but missing its target email." },
        403
      );
    }
    if (inviteEmail !== userEmail) {
      return jsonWithRes(response, { ok: false, error: "This invite is not for your email address." }, 403);
    }
  }

  // 6) Team name: set from body if provided; else require existing profile team_name
  const maybeName = normalizeTeamName(teamNameIn ?? null);
  if (maybeName) {
    const { error: profileErr } = await client
      .from("profiles")
      .upsert([{ id: user.id, team_name: maybeName }], { onConflict: "id" });
    if (profileErr) {
      return jsonWithRes(
        response,
        { ok: false, error: "Failed to set team name on profile.", code: profileErr.code, detail: profileErr.message },
        500
      );
    }
  } else {
    const { data: p, error: profErr } = await client
      .from("profiles")
      .select("team_name")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr) {
      return jsonWithRes(
        response,
        { ok: false, error: "Failed to load profile.", code: profErr.code, detail: profErr.message },
        500
      );
    }
    if (!((p?.team_name ?? "").trim())) {
      return jsonWithRes(
        response,
        {
          ok: false,
          error: "Failed to create membership.",
          detail: "User must set a Team Name in profile before joining a league.",
        },
        400
      );
    }
  }

  // 7) Idempotent accepted check (support both schemas)
  const alreadyAccepted =
    Boolean(invite.accepted) || Boolean(invite.accepted_at) || Boolean(invite.accepted_by);

  // 8) Accept if not already
  if (!alreadyAccepted) {
    // Try modern columns first
    let upd = await client
      .from("invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq("token", token)
      .is("accepted_at", null)
      .select("id")
      .maybeSingle();

    if (upd.error && isUnknownColumn(upd.error)) {
      // Fallback to legacy boolean
      upd = await client
        .from("invites")
        .update({ accepted: true })
        .eq("token", token)
        .eq("accepted", false)
        .select("id")
        .maybeSingle();
    }

    // Another worker could have updated first — treat as success unless it's a real error
    if (upd.error && upd.error?.code !== "PGRST116") {
      return jsonWithRes(
        response,
        { ok: false, error: "Failed to accept invite.", code: upd.error.code, detail: upd.error.message },
        500
      );
    }
  }

  // 9) Ensure membership (RPC if available; otherwise upsert)
  const leagueId = String(invite.league_id);

  const sb: any = client as any; // avoid TS complaining if types mismatch
  let rpcError: any = null;

  try {
    if (typeof sb.rpc === "function") {
      const out = await sb.rpc("ensure_league_membership", {
        p_league_id: leagueId,
        p_user_id: user.id,
      });
      if (out?.error) rpcError = out.error;
    } else {
      rpcError = { message: "rpc_missing" };
    }
  } catch {
    rpcError = { message: "rpc_missing" };
  }

  if (rpcError && rpcError.message !== "rpc_missing") {
    devlog("[invite accept] membership rpc error", rpcError);
    return jsonWithRes(
      response,
      { ok: false, error: "Could not create membership.", code: rpcError.code, detail: rpcError.message },
      500
    );
  }

  if (rpcError && rpcError.message === "rpc_missing") {
    const { error: upsertErr } = await client
      .from("league_members")
      .upsert({ league_id: leagueId, user_id: user.id, role: "member" }, { onConflict: "league_id,user_id" });
    if (upsertErr && upsertErr.code !== "23505") {
      return jsonWithRes(
        response,
        { ok: false, error: "Failed to create membership.", code: upsertErr.code, detail: upsertErr.message },
        500
      );
    }
  }

  devlog("[invite accept] success", { leagueId, userId: user.id });
  return jsonWithRes(response, { ok: true, league_id: leagueId, alreadyAccepted }, 200);
}
