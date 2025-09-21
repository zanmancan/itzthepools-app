// src/app/api/invites/accept/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";
import { devlog, devtime, devtimeEnd, deverror } from "@/lib/devlog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { token?: string | null; teamName?: string | null };

function normalizeTeamName(n?: string | null) {
  const v = (n ?? "").trim();
  if (!v) return { ok: false as const, value: null as null };
  if (v.length < 2) return { ok: false as const, value: null as null };
  if (v.length > 30) return { ok: false as const, value: null as null };
  if (!/^[A-Za-z0-9 _-]+$/.test(v)) return { ok: false as const, value: null as null };
  return { ok: true as const, value: v };
}

export async function POST(req: NextRequest) {
  const { client: sb, response: res } = supabaseServer(req);

  // 1) Parse input
  let token = "";
  let teamNameIn: string | null | undefined = undefined;
  try {
    const body = (await req.json()) as Body;
    token = typeof body?.token === "string" ? body.token.trim() : "";
    teamNameIn = typeof body?.teamName === "string" ? body.teamName : undefined;
  } catch {
    /* ignore */
  }
  if (!token) {
    const q = new URL(req.url).searchParams.get("token");
    if (q) token = q.trim();
  }
  if (!token) return jsonWithRes(res, { error: "token is required" }, 400);

  // 2) Auth + verified email
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();
  if (userErr || !user) return jsonWithRes(res, { error: "Not authenticated." }, 401);
  if (!user.email_confirmed_at) {
    return jsonWithRes(res, { error: "Please verify your email to continue." }, 401);
  }

  devlog("[invite:accept] start", { token, user: user.id });

  // 3) Team name handling (body wins, else must exist on profile)
  let teamName: string | null = null;
  const norm = normalizeTeamName(teamNameIn ?? null);

  if (norm.ok && norm.value) {
    teamName = norm.value;
    const { error: profileErr } = await sb
      .from("profiles")
      .upsert([{ id: user.id, team_name: teamName }], { onConflict: "id" });
    if (profileErr) {
      deverror("[invite:accept] set team name failed", profileErr);
      return jsonWithRes(
        res,
        { error: "Failed to set team name on profile.", detail: profileErr.message, code: profileErr.code },
        500
      );
    }
  } else {
    const { data: p, error: profErr } = await sb
      .from("profiles")
      .select("team_name")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr) {
      deverror("[invite:accept] load profile failed", profErr);
      return jsonWithRes(res, { error: "Failed to load profile." }, 500);
    }
    teamName = (p?.team_name ?? "").trim() || null;
    if (!teamName) {
      return jsonWithRes(
        res,
        {
          error: "Failed to create membership.",
          detail: "User must set a Team Name in profile before joining a league.",
        },
        500
      );
    }
  }

  // 4) Load invite by token (so we can validate email & expiry first)
  devtime("invite:accept:load");
  const { data: inv, error: loadErr } = await sb
    .from("invites")
    .select("id, league_id, email, accepted, expires_at")
    .eq("token", token)
    .maybeSingle();
  devtimeEnd("invite:accept:load");

  if (loadErr) {
    deverror("[invite:accept] load invite failed", loadErr);
    return jsonWithRes(res, { error: "Failed to load invite." }, 500);
  }
  if (!inv) {
    devlog("[invite:accept] invite not found", { token });
    return jsonWithRes(res, { error: "Invite not found." }, 404);
  }

  // 5) Idempotent: already accepted?
  if (inv.accepted) {
    devlog("[invite:accept] already accepted", { league_id: inv.league_id, invite_id: inv.id });
    return jsonWithRes(res, { ok: true, alreadyAccepted: true, league_id: String(inv.league_id) }, 200);
  }

  // 6) Expiry check
  const now = new Date();
  if (inv.expires_at && new Date(inv.expires_at) <= now) {
    devlog("[invite:accept] expired", { invite_id: inv.id, expires_at: inv.expires_at });
    return jsonWithRes(res, { error: "Invite has expired." }, 410);
  }

  // 7) Email-locked guard (public invites have email=null)
  const inviteEmail = String(inv.email ?? "").toLowerCase();
  const userEmail = String(user.email ?? "").toLowerCase();
  if (inviteEmail && inviteEmail !== userEmail) {
    devlog("[invite:accept] blocked wrong email", { inviteEmail, userEmail });
    return jsonWithRes(res, { error: "This invite is not for your email address." }, 403);
  }

  // 8) Idempotent membership
  const league_id = String(inv.league_id);
  const { data: existing, error: existErr } = await sb
    .from("league_members")
    .select("user_id")
    .eq("league_id", league_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existErr) {
    deverror("[invite:accept] check membership failed", existErr);
    return jsonWithRes(res, { error: "Failed to check membership." }, 500);
  }
  if (!existing) {
    const payload = { league_id, user_id: user.id, role: "member" as const };
    const { error: insErr } = await sb.from("league_members").insert([payload]);
    if (insErr && insErr.code !== "23505") {
      deverror("[invite:accept] create membership failed", insErr, { payload });
      return jsonWithRes(res, { error: "Failed to create membership." }, 500);
    }
  }

  // 9) Mark invite accepted (+ stamp accepted_at) with a guard
  const { error: updErr } = await sb
    .from("invites")
    .update({ accepted: true, accepted_at: now.toISOString() })
    .eq("id", inv.id)
    .eq("accepted", false);
  if (updErr) {
    // membership is already in place; don’t block success, just log
    deverror("[invite:accept] update accepted failed", updErr, { invite_id: inv.id });
  }

  devlog("[invite:accept] success", { league_id, user_id: user.id, invite_id: inv.id });
  return jsonWithRes(res, { ok: true, league_id }, 200);
}
