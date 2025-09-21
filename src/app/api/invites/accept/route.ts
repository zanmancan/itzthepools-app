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

  // 1) Parse token + optional team name
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

  // 2) Auth + require verified email
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();
  if (userErr || !user) return jsonWithRes(res, { error: "Not authenticated." }, 401);
  if (!user.email_confirmed_at) {
    return jsonWithRes(res, { error: "Please verify your email to continue." }, 401);
  }

  devlog("[invite:accept] start", { user: user.id, token });

  // 3) Team name: from body (and persist), or from profile, or block
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
        {
          error: "Failed to set team name on profile.",
          code: profileErr.code,
          detail: profileErr.message,
        },
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

  // 4) Accept invite iff not already accepted
  devtime("invite:accept:update");
  const { data: inv, error: updErr } = await sb
    .from("invites")
    .update({ accepted: true })
    .eq("token", token)
    .eq("accepted", false)
    .select("league_id, email")
    .maybeSingle();
  devtimeEnd("invite:accept:update");

  if (updErr) {
    deverror("[invite:accept] update failed", updErr);
    return jsonWithRes(
      res,
      { error: "Failed to accept invite (update).", code: updErr.code, detail: updErr.message },
      500
    );
  }
  if (!inv) {
    // Either not found or already accepted — avoid scary UX
    devlog("[invite:accept] invite not found or already accepted", { token });
    return jsonWithRes(res, { ok: true, alreadyAccepted: true }, 200);
  }

  // 5) Enforce email-locked invite
  const inviteEmail = String(inv.email ?? "").toLowerCase();
  const userEmail = String(user.email ?? "").toLowerCase();
  if (inviteEmail && inviteEmail !== userEmail) {
    devlog("[invite:accept] blocked wrong email", { inviteEmail, userEmail });
    return jsonWithRes(res, { error: "This invite is not for your email address." }, 403);
  }

  // 6) Idempotent membership
  const league_id = String(inv.league_id);

  // Does membership already exist?
  const { data: existing, error: existErr } = await sb
    .from("league_members")
    .select("user_id")
    .eq("league_id", league_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existErr) {
    deverror("[invite:accept] check membership failed", existErr);
    return jsonWithRes(
      res,
      { error: "Failed to check membership.", code: existErr.code, detail: existErr.message },
      500
    );
  }

  if (!existing) {
    const payload = { league_id, user_id: user.id, role: "member" as const };
    const { error: insErr } = await sb.from("league_members").insert([payload]);
    if (insErr && insErr.code !== "23505") {
      deverror("[invite:accept] create membership failed", insErr, { payload });
      return jsonWithRes(
        res,
        { error: "Failed to create membership.", code: insErr.code, detail: insErr.message },
        500
      );
    }
  }

  devlog("[invite:accept] success", { league_id, user_id: user.id });
  return jsonWithRes(res, { ok: true, league_id }, 200);
}
