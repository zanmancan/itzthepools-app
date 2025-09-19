// src/app/api/invites/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

/**
 * POST /api/invites/accept
 * body: { token: string }
 * Response: { ok: true, leagueId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return new NextResponse("Missing token", { status: 400 });

    const sb = supabaseRoute();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    // Grab the league id up-front so we can send the user to that page.
    const { data: inv, error: invErr } = await sb
      .from("invites")
      .select("league_id")
      .eq("token", token)
      .single();

    // If the invite might already be consumed by another process, we still try RPC below
    const leagueId = inv?.league_id ?? null;

    const { error } = await sb.rpc("accept_invite", { p_token: token });
    if (error) return new NextResponse(error.message, { status: 400 });

    // If we didn't find it above, attempt a second look (optional safety)
    if (!leagueId) {
      const { data: inv2 } = await sb
        .from("invites")
        .select("league_id")
        .eq("token", token)
        .maybeSingle();
      return NextResponse.json({ ok: true, leagueId: inv2?.league_id ?? null });
    }

    return NextResponse.json({ ok: true, leagueId });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
