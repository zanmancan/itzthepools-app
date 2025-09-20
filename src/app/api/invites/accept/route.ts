import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * POST /api/invites/accept
 * body: { token: string }
 * Returns: { leagueId: string }
 */
export async function POST(req: Request) {
  try {
    const { token } = await req.json().catch(() => ({} as any));
    if (!token) {
      return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
    }

    const sb = supabaseServer(); // ← no args

    // Ensure user is signed in
    const { data: userRes, error: userErr } = await sb.auth.getUser();
    if (userErr || !userRes?.user) {
      return NextResponse.json(
        { error: "You must be signed in to accept an invite." },
        { status: 401 }
      );
    }
    const user = userRes.user;

    // Find invite by token and make sure it’s usable
    const { data: invite, error: inviteErr } = await sb
      .from("invites")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (inviteErr || !invite) {
      return NextResponse.json(
        { error: "Invite not found, already used, or invalid." },
        { status: 404 }
      );
    }

    // Expiration guard (optional column)
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
    }

    // Targeted invite guard (matches invite.email if set)
    const target = String(invite.email ?? "").toLowerCase();
    if (target && target !== String(user.email ?? "").toLowerCase()) {
      return NextResponse.json(
        {
          error: `This invite was sent to ${invite.email}, but you are signed in as ${user.email}.`,
        },
        { status: 403 }
      );
    }

    // Ensure a profile row exists (safe upsert)
    await sb.from("profiles").upsert(
      { id: user.id, email: user.email ?? null },
      { onConflict: "id" } as any
    );

    // Add membership (idempotent)
    const { error: memberErr } = await sb
      .from("league_members")
      .upsert(
        {
          league_id: invite.league_id,
          user_id: user.id,
          role: invite.role ?? "member",
        },
        { onConflict: "league_id,user_id", ignoreDuplicates: true } as any
      );

    if (memberErr) {
      console.error("accept_invite: league_members upsert failed", memberErr);
      return NextResponse.json(
        { error: "Could not add you to the league." },
        { status: 500 }
      );
    }

    // Mark the invite as used (best-effort)
    await sb
      .from("invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    return NextResponse.json({ leagueId: invite.league_id });
  } catch (e: any) {
    console.error("accept_invite fatal", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error while accepting invite." },
      { status: 500 }
    );
  }
}
