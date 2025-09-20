// src/app/api/invites/accept-with-name/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { token, teamName } -> accept + set team name (atomic) */
export async function POST(req: NextRequest) {
  try {
    const { token, teamName } = await req.json().catch(() => ({} as any));
    if (!token || !teamName) {
      return NextResponse.json({ error: "Missing token or teamName" }, { status: 400 });
    }

    // Create a response up-front and pass it to supabaseRoute so any refreshed
    // auth cookies are written onto *this* response that we return.
    const res = NextResponse.json({ ok: true });
    const sb = supabaseRoute(req, res);

    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
    if (!user)   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await sb.rpc("accept_invite_with_name", {
      p_token: token,
      p_team_name: teamName,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Return the same `res` so any Set-Cookie headers are preserved.
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
