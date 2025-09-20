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

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  try {
    const { leagueId, email, expiresAt } = (await req.json().catch(() => ({}))) as Body;
    if (!leagueId || !email) {
      return new NextResponse(JSON.stringify({ error: "leagueId and email required" }), {
        status: 400,
        headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }

    const sb = supabaseRoute(req, res);

    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr) {
      return new NextResponse(JSON.stringify({ error: userErr.message }), {
        status: 500,
        headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }

    // Check owner/admin
    const { data: membership, error: memErr } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (memErr) {
      return new NextResponse(JSON.stringify({ error: `membership lookup failed: ${memErr.message}` }), {
        status: 400,
        headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }
    if (!membership || !["owner", "admin"].includes(membership.role as any)) {
      return new NextResponse(JSON.stringify({ error: "only league owner/admin can invite" }), {
        status: 403,
        headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }

    // Prefer your RPC if it exists:
    let token: string | null = null;

    const tryRpc = await sb.rpc("create_email_invite", {
      p_league_id: leagueId,
      p_email: email,
      p_expires_at: expiresAt ?? null,
    });

    if (!tryRpc.error && tryRpc.data) {
      token = String(tryRpc.data); // RPC returns token
    } else {
      // Fallback: insert into invites table (no expiry handling here)
      token = randomUUID();
      const { error: insErr } = await sb.from("invites").insert({
        league_id: leagueId,
        email,
        invited_by: user.id,
        token,
        accepted: false,
      });
      if (insErr) {
        return new NextResponse(JSON.stringify({ error: `insert failed: ${insErr.message}` }), {
          status: 400,
          headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
        });
      }
    }

    const joinUrl = `${siteUrl()}/invite/${token}`;
    return new NextResponse(JSON.stringify({ ok: true, token, joinUrl }), {
      status: 200,
      headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
    });
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ error: e?.message ?? "Server error" }), {
      status: 500,
      headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
    });
  }
}
