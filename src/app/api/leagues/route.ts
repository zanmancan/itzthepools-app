// src/app/api/leagues/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

/**
 * POST /api/leagues
 * body: {
 *   name: string,
 *   ruleset: string,
 *   season: string,
 *   isPublic?: boolean,
 *   maxMembers?: number | null,                 // null/blank => DB default (50)
 *   defaultInviteExpiresDays?: number | null,   // 0 => never; null/blank => DB default (7)
 *   defaultInviteMaxUses?: number | null        // 0 => unlimited; null/blank => DB default (1 or null)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) ?? {};
    const {
      name,
      ruleset,
      season,
      isPublic = false,
      maxMembers = null,
      defaultInviteExpiresDays = null,
      defaultInviteMaxUses = null,
    } = body;

    if (!name || !ruleset || !season) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const sb = supabaseRoute();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    // Normalize numbers (allow "", null)
    const normMaxMembers =
      maxMembers === "" || maxMembers === null || typeof maxMembers === "undefined"
        ? null
        : Number(maxMembers);

    const normExpiresDays =
      defaultInviteExpiresDays === "" ||
      defaultInviteExpiresDays === null ||
      typeof defaultInviteExpiresDays === "undefined"
        ? null
        : Number(defaultInviteExpiresDays); // 0 is allowed (never expires)

    const normMaxUses =
      defaultInviteMaxUses === "" ||
      defaultInviteMaxUses === null ||
      typeof defaultInviteMaxUses === "undefined"
        ? null
        : Number(defaultInviteMaxUses); // 0 is allowed (unlimited)

    const { data, error } = await sb
      .from("leagues")
      .insert({
        name,
        ruleset,
        season,
        owner_id: user.id,
        is_public: !!isPublic,
        // When null, DB default from your SQL migration will apply
        max_members: Number.isFinite(normMaxMembers) ? normMaxMembers : null,
        default_invite_expires_days: Number.isFinite(normExpiresDays) ? normExpiresDays : null,
        default_invite_max_uses: Number.isFinite(normMaxUses) ? normMaxUses : null,
      })
      .select(
        "id, name, ruleset, season, is_public, max_members, default_invite_expires_days, default_invite_max_uses"
      )
      .single();

    if (error) return new NextResponse(error.message, { status: 400 });
    return NextResponse.json({ league: data });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
