import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * POST /api/invites/accept
 * body: { token: string }
 * Returns: { leagueId: string }
 */
export async function POST(req: Request) {
  try {
    // --- 1) Parse body safely ---
    let token: string | undefined;
    try {
      const body = (await req.json()) as { token?: string };
      token = body?.token;
    } catch {
      token = undefined;
    }
    if (!token) {
      return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
    }

    // --- 2) Ensure signed in ---
    const sb = supabaseServer(); // <-- no args
    const { data: userRes, error: userErr } = await sb.auth.getUser();
    if (userErr || !userRes?.user) {
      return NextResponse.json(
        { error: "You must be signed in to accept an invite." },
        { status: 401 }
      );
    }
    const user = userRes.user;

    // --- 3) Load invite (must exist & not be used) ---
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

    // Optional: expiration guard
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
    }

    // --- 4) Targeted invite guard ---
    const target = String(invite.email ?? "").toLowerCase();
    if (target && target !== String(user.email ?? "").toLowerCase()) {
      return NextResponse.json(
        {
          error: `This invite was sent to ${invite.email}, but you are signed in as ${user.email}.`,
        },
        { status: 403 }
      );
    }

    // --- 5) Ensure a profile exists (id = auth.users.id) ---
    {
      const { error } = await sb
        .from("profiles")
        .upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id" } as any);
      if (error) {
        console.error("accept_invite: profiles upsert failed:", error);
        return NextResponse.json(
          { error: "Could not create your profile." },
          { status: 500 }
        );
      }
    }

    // --- 6) Add membership (no error on duplicates) ---
    {
      const { error } = await sb
        .from("league_members")
        .upsert(
          {
            league_id: invite.league_id,
            user_id: user.id,
            role: invite.role ?? "member",
          } as any,
          { onConflict: "league_id,user_id" } as any
        );

      if (error) {
        console.error("accept_invite: league_members upsert failed:", error);
        return NextResponse.json(
          { error: "Could not add you to the league." },
          { status: 500 }
        );
      }
    }

    // --- 7) Mark invite used (best effort) ---
    {
      const { error } = await sb
        .from("invites")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invite.id);
      if (error) {
        console.warn("accept_invite: marking invite used failed:", error);
      }
    }

    // --- 8) Success ---
    return NextResponse.json({ leagueId: invite.league_id });
  } catch (e: any) {
    console.error("accept_invite fatal:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error while accepting invite." },
      { status: 500 }
    );
  }
}
