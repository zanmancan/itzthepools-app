// src/app/api/invites/open/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const { leagueId, maxUses, expiresAt } = await req.json();
    const sb = supabaseRoute();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { data: token, error } = await sb.rpc("create_open_invite", {
      p_league_id: leagueId,
      p_max_uses: maxUses ?? null,
      p_expires_at: expiresAt ?? null,
    });
    if (error) return new NextResponse(error.message, { status: 400 });

    const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'}/join/${token}`;
    return NextResponse.json({ joinUrl });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
