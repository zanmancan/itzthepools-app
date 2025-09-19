import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-server";

/** GET /api/invites/token/:token -> { leagueId, leagueName, ruleset, season } */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    const sb = supabaseRoute();

    const { data: invite, error: invErr } = await sb
      .from("invites")
      .select("id, token, accepted_at, league:league_id(id, name, ruleset, season)")
      .eq("token", token)
      .single();

    if (invErr || !invite) return new NextResponse("Not found", { status: 404 });
    if (invite.accepted_at) return NextResponse.json({ status: "used" });

    return NextResponse.json({
      status: "ok",
      leagueId: invite.league.id,
      leagueName: invite.league.name,
      ruleset: invite.league.ruleset,
      season: invite.league.season
    });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
