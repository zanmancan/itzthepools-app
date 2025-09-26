// src/app/api/invites/mine/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { USE_SUPABASE } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invites/mine
 * When USE_SUPABASE=1:
 *   returns { invites: Array<{token,email,leagueId,leagueName,expiresAt,consumedAt}> }
 *   for invites to leagues owned by the authed user.
 * Otherwise:
 *   404 (client will fall back to dev endpoints)
 */
export async function GET() {
  if (!USE_SUPABASE) return new NextResponse("Not Found", { status: 404 });

  try {
    const sb = supabaseServer();
    const { data: userData, error: userErr } = await sb.auth.getUser();
    const ownerEmail = userData?.user?.email ?? null;
    if (userErr || !ownerEmail) {
      return NextResponse.json({ invites: [] });
    }

    // Assumed schema:
    //   leagues(id, name, owner_email)
    //   invites(token, email, league_id, expires_at, consumed_at)
    const { data, error } = await sb
      .from("invites")
      .select("token, email, league_id, expires_at, consumed_at, leagues:league_id(id,name,owner_email)")
      .eq("leagues.owner_email", ownerEmail); // filter via foreign table

    if (error) {
      return NextResponse.json({ invites: [] });
    }

    const invites =
      (data ?? []).map((r: any) => ({
        token: String(r.token),
        email: String(r.email),
        leagueId: String(r.league_id),
        leagueName: String(r.leagues?.name ?? ""),
        expiresAt: r.expires_at ? Number(r.expires_at) : Date.now() + 7 * 86400_000,
        consumedAt: r.consumed_at ?? null,
      })) || [];

    return NextResponse.json({ invites });
  } catch {
    return NextResponse.json({ invites: [] });
  }
}
