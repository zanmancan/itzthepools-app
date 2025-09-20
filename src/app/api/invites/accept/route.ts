// src/app/api/invites/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { token } -> accept invite (no team name change) */
export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  try {
    const sb = supabaseRoute(req, res);

    const { token } = await req.json().catch(() => ({} as any));
    if (!token) {
      return new NextResponse(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }

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

    const { data, error } = await sb.rpc("accept_invite", { p_token: token });
    if (error) {
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }

    const leagueId = data as string;
    return new NextResponse(JSON.stringify({ ok: true, leagueId }), {
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
