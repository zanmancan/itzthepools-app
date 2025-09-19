import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

/** GET /api/invites/list?leagueId=...  */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const leagueId = url.searchParams.get("leagueId") ?? "";
    if (!leagueId) return new NextResponse("Missing leagueId", { status: 400 });

    const sb = supabaseRoute();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    // ensure current user owns the league
    const { data: ownerRow } = await sb
      .from("leagues")
      .select("id")
      .eq("id", leagueId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!ownerRow) return new NextResponse("Not owner", { status: 403 });

    const { data, error } = await sb
      .from("invites")
      .select("id, token, email, expires_at, max_uses, use_count, created_at, revoked_at, accepted_at")
      .eq("league_id", leagueId)
      .order("created_at", { ascending: false });

    if (error) return new NextResponse(error.message, { status: 400 });

    return NextResponse.json({ invites: data ?? [] });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
