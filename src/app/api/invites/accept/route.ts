// src/app/api/invites/accept/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";

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
  const { client, response } = supabaseServer(req);

  // 1) Parse
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
  if (!token) return jsonWithRes(response, { error: "token is required" }, 400);

  // 2) Auth + email verified
  const { data: { user }, error: userErr } = await client.auth.getUser();
  if (userErr || !user) return jsonWithRes(response, { error: "Not authenticated." }, 401);

  // 🔒 Require verified email before joining any league
  if (!user.email_confirmed_at) {
    return jsonWithRes(response, { error: "Please verify your email to continue." }, 401);
  }

  // 3) Team Name: provided or existing on profile (otherwise block)
  let teamName: string | null = null;
  const norm = normalizeTeamName(teamNameIn ?? null);
  if (norm.ok && norm.value) {
    teamName = norm.value;
    const { error: profileErr } = await client
      .from("profiles")
      .upsert([{ id: user.id, team_name: teamName }], { onConflict: "id" });
    if (profileErr) {
      return jsonWithRes(
        response,
        { error: "Failed to set team name on profile.", code: profileErr.code, detail: profileErr.message },
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
        { error: "Failed to load profile.", code: profErr.code, detail: profErr.message },
        500
      );
    }
    teamName = (p?.team_name ?? "").trim() || null;

    if (!teamName) {
      return jsonWithRes(
        response,
        { error: "Failed to create membership.", detail: "User must set a Team Name in profile before joining a league." },
        500
      );
    }
  }

  // 4) Accept invite with single UPDATE ... RETURNING
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
  if (!inv) return jsonWithRes(response, { error: "Invite not found, already used, or not accessible." }, 404);

  // 5) Enforce email-locked invite
  const inviteEmail = String(inv.email ?? "").toLowerCase();
  const userEmail = String(user.email ?? "").toLowerCase();
  if (inviteEmail && inviteEmail !== userEmail) {
    return jsonWithRes(response, { error: "This invite is not for your email address." }, 403);
  }

  // 6) Idempotent membership
  const { data: existing, error: existErr } = await client
    .from("league_members")
    .select("user_id")
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
    const payload = { league_id: String(inv.league_id), user_id: user.id, role: "member" as const };
    const { error: insErr } = await client.from("league_members").insert([payload]);
    if (insErr && insErr.code !== "23505") {
      return jsonWithRes(
        response,
        { error: "Failed to create membership.", code: insErr.code, detail: insErr.message },
        500
      );
    }
  }

  return jsonWithRes(response, { ok: true, league_id: inv.league_id }, 200);
}
