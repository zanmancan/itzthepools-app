import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-server";

/**
 * PATCH /api/leagues/:id/settings
 * body: { isPublic?: boolean, maxMembers?: number, defaultInviteExpiresDays?: number }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string }}) {
  try {
    const leagueId = params.id;
    const { isPublic, maxMembers, defaultInviteExpiresDays } = await req.json();

    const sb = supabaseRoute();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    // Ensure owner
    const { data: ownerRow, error: ownErr } = await sb
      .from("leagues").select("id, locked, owner_id")
      .eq("id", leagueId).eq("owner_id", user.id).single();
    if (ownErr || !ownerRow) return new NextResponse("Not owner", { status: 403 });
    if (ownerRow.locked) return new NextResponse("League is locked", { status: 400 });

    const patch: any = {};
    if (typeof isPublic === "boolean") patch.is_public = isPublic;
    if (Number.isFinite(maxMembers)) patch.max_members = Number(maxMembers);
    if (Number.isFinite(defaultInviteExpiresDays)) patch.default_invite_expires_days = Number(defaultInviteExpiresDays);

    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

    const { error } = await sb.from("leagues").update(patch).eq("id", leagueId);
    if (error) return new NextResponse(error.message, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
