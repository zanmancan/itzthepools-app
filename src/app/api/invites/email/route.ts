// src/app/api/invites/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { leagueId?: string; email?: string; expiresAt?: string | null };

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3001";
}

/** Ensure we forward any Set-Cookie headers returned by supabaseRoute */
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
  // Initialize cookie-bound supabase client and a response shell
  let sb: ReturnType<typeof supabaseRoute>["client"];
  let res: NextResponse;
  try {
    ({ client: sb, response: res } = supabaseRoute(req));
  } catch (e: any) {
    return NextResponse.json(
      { error: `supabase client init failed: ${e?.message || String(e)}` },
      { status: 500 }
    );
  }

  try {
    const { leagueId, email, expiresAt } = (await req.json().catch(() => ({}))) as Body;
    if (!leagueId || !email) {
      return jsonWithRes(res, { error: "leagueId and email required" }, 400);
    }

    // Auth
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    if (userErr) return jsonWithRes(res, { error: userErr.message }, 500);
    if (!user) return jsonWithRes(res, { error: "Unauthorized" }, 401);

    // Owner/admin check
    const { data: membership, error: memErr } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) {
      return jsonWithRes(res, { error: `membership lookup failed: ${memErr.message}` }, 400);
    }
    if (!membership || !["owner", "admin"].includes(membership.role as any)) {
      return jsonWithRes(res, { error: "only league owner/admin can invite" }, 403);
    }

    // Prefer your RPC if it exists (returns a token), else fallback to raw insert
    let token: string;

    const tryRpc = await sb.rpc("create_email_invite", {
      p_league_id: leagueId,
      p_email: email,
      p_expires_at: expiresAt ?? null,
    });

    if (!tryRpc.error && tryRpc.data) {
      token = String(tryRpc.data);
    } else {
      token = randomUUID();
      const { error: insErr } = await sb.from("invites").insert({
        league_id: leagueId,
        email,
        invited_by: user.id,
        token,
        accepted: false,
      });
      if (insErr) {
        return jsonWithRes(res, { error: `insert failed: ${insErr.message}` }, 400);
    }
    }

    const joinUrl = `${siteUrl()}/invite/${token}`;
    return jsonWithRes(res, { ok: true, token, joinUrl }, 200);
  } catch (e: any) {
    return jsonWithRes(res, { error: e?.message ?? "Server error" }, 500);
  }
}
