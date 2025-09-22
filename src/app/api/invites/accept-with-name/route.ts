// src/app/api/invites/accept-with-name/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight row types so TS stops inferring `never` */
type InviteRow = {
  id: string;
  token: string;
  league_id: string;
  email: string | null;
  is_public: boolean | null;
  accepted: boolean | null;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
};

type LeagueMemberUpsert = {
  league_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  team_name?: string | null;
};

function jsonWithRes(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(res.headers),
    },
  });
}

export async function POST(req: NextRequest) {
  let sb, res: NextResponse;
  try {
    ({ client: sb, response: res } = supabaseRoute(req));
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to initialize Supabase client" },
      { status: 500 }
    );
  }

  try {
    const { p_token, p_team_name } = await req.json().catch(() => ({}));
    const token = String(p_token || "").trim();
    const teamName = String(p_team_name || "").trim();

    if (!token) return jsonWithRes(res, { error: "Missing invite token." }, 400);
    if (!teamName) return jsonWithRes(res, { error: "Team name is required." }, 400);

    // Who am I?
    const {
      data: { user },
      error: uerr,
    } = await sb.auth.getUser();
    if (uerr) return jsonWithRes(res, { error: uerr.message }, 500);
    if (!user) return jsonWithRes(res, { error: "Unauthorized" }, 401);

    // Load invite by token – cast result to our local type
    const { data, error } = await sb
      .from("invites")
      .select(
        "id, token, league_id, email, is_public, accepted, accepted_at, revoked_at, expires_at"
      )
      .eq("token", token)
      .maybeSingle();

    if (error) return jsonWithRes(res, { error: error.message }, 400);

    const inv = (data as any) as InviteRow | null;
    if (!inv) return jsonWithRes(res, { error: "Invite not found." }, 404);

    // Validate state
    if (inv.revoked_at) return jsonWithRes(res, { error: "Invite has been revoked." }, 409);
    if (inv.accepted) return jsonWithRes(res, { error: "Invite already used." }, 409);
    if (inv.expires_at) {
      const exp = new Date(inv.expires_at);
      if (!Number.isNaN(+exp) && exp.getTime() < Date.now()) {
        return jsonWithRes(res, { error: "Invite has expired." }, 409);
      }
    }

    // If email invite, ensure email matches the signed-in user
    if (inv.email && user.email && inv.email.toLowerCase() !== user.email.toLowerCase()) {
      return jsonWithRes(res, { error: "This invite was addressed to a different email." }, 403);
    }

    // Upsert league_members (cast the *builder* to any so TS won't infer `never`)
    const up: LeagueMemberUpsert = {
      league_id: inv.league_id,
      user_id: user.id,
      role: "member",
      team_name: teamName,
    };

    {
      const { error: upErr } = (sb.from("league_members") as any).upsert(up, {
        onConflict: "league_id,user_id",
      });
      if (upErr) return jsonWithRes(res, { error: upErr.message }, 400);
    }

    // Mark invite as accepted (cast builder to any for the update)
    {
      const payload = {
        accepted: true,
        accepted_at: new Date().toISOString(),
      };

      const { error: updErr } = (sb.from("invites") as any)
        .update(payload)
        .eq("id", inv.id);
      if (updErr) return jsonWithRes(res, { error: updErr.message }, 400);
    }

    return jsonWithRes(res, { ok: true, message: "Success! You’ve joined the league." });
  } catch (e: any) {
    return jsonWithRes(res, { error: e?.message || "Server error" }, 500);
  }
}
