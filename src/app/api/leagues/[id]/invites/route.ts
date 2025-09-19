import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-server";

/** GET /api/leagues/:id/invites -> list all invites (owner-only) */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const leagueId = params.id;
    const sb = supabaseRoute();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    // owner gate
    const { data: league, error: ownErr } = await sb
      .from("leagues").select("id").eq("id", leagueId).eq("owner_id", user.id).single();
    if (ownErr || !league) return new NextResponse("Not owner", { status: 403 });

    const { data: rows, error } = await sb
      .from("invites")
      .select("id, token, email, created_at, expires_at, accepted_at, revoked_at")
      .eq("league_id", leagueId)
      .order("created_at", { ascending: false });

    if (error) return new NextResponse(error.message, { status: 400 });
    return NextResponse.json({ invites: rows ?? [] });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
