// src/app/api/invites/accept/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { token?: string | null; teamName?: string | null };

function normalizeTeamName(n?: string | null) {
  const v = (n ?? "").trim();
  if (!v) return { ok: false as const, error: "teamName is required." };
  if (v.length < 2) return { ok: false as const, error: "teamName must be at least 2 characters." };
  if (v.length > 30) return { ok: false as const, error: "teamName must be 30 characters or fewer." };
  if (!/^[A-Za-z0-9 _-]+$/.test(v))
    return {
      ok: false as const,
      error: "teamName may contain letters, numbers, spaces, dashes, underscores.",
    };
  return { ok: true as const, value: v };
}

export async function POST(req: NextRequest) {
  const { client, response } = supabaseServer(req);

  // 1) Parse token + teamName
  let token = "";
  let teamNameIn: string | null | undefined = undefined;
  try {
    const body = (await req.json()) as Body;
    token = typeof body?.token === "string" ? body.token.trim() : "";
    teamNameIn = typeof body?.teamName === "string" ? body.teamName : undefined;
  } catch {
    /* ignore; may be in query */
  }
  if (!token) {
    const q = new URL(req.url).searchParams.get("token");
    if (q) token = q.trim();
  }

  const teamCheck = normalizeTeamName(teamNameIn ?? null);
  if (!token) return jsonWithRes(response, { error: "token is required" }, 400);
  if (!teamCheck.ok) return jsonWithRes(response, { error: teamCheck.error }, 400);
  const teamName = teamCheck.value;

  // 2) Must be signed in
  const {
    data: { user },
    error: userErr,
  } = await client.auth.getUser();
  if (userErr || !user) return jsonWithRes(response, { error: "Not authenticated." }, 401);

  // 3) Ensure profile.team_name is set (UPSERT by id)
  //    RLS must allow: INSERT/UPDATE where id = auth.uid()
  const profilePayload = { id: user.id, team_name: teamName };
  const { error: profileErr } = await client
    .from("profiles")
    .upsert([profilePayload], { onConflict: "id" });

  if (profileErr) {
    return jsonWithRes(
      response,
      {
        error: "Failed to set team name on profile.",
        code: profileErr.code,
        detail: profileErr.message,
      },
      500
    );
  }

  // 4) Accept invite with a single UPDATE ... RETURNING
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

  // 5) If the invite was email-locked, enforce match
  const inviteEmail = String(inv.email ?? "").toLowerCase();
  const userEmail = String(user.email ?? "").toLowerCase();
  if (inviteEmail && inviteEmail !== userEmail) {
    return jsonWithRes(
      response,
      { error: "This invite is not for your email address." },
      403
    );
  }

  // 6) Idempotent membership: check first, insert if missing
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
    const payload = {
      league_id: String(inv.league_id),
      user_id: user.id,
      role: "member" as const,
    };
    const { error: insErr } = await client.from("league_members").insert([payload]);

    if (insErr) {
      const isDuplicate = insErr.code === "23505"; // race-safe
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
