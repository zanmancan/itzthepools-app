// src/app/api/invites/accept/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic"; // avoid caching surprises

type AcceptBody = { token?: string };

export async function POST(req: Request) {
  try {
    // 1) Parse body (never throw)
    let token: string | undefined;
    try {
      const body = (await req.json()) as AcceptBody;
      token = body?.token;
    } catch {
      token = undefined;
    }
    if (!token) {
      return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
    }

    const sb = supabaseServer();

    // 2) Must be signed in
    const { data: userRes, error: userErr } = await sb.auth.getUser();
    if (userErr || !userRes?.user) {
      console.error("accept_invite: getUser failed:", userErr);
      return NextResponse.json({ error: "You must be signed in to accept an invite." }, { status: 401 });
    }
    const user = userRes.user;

    // 3) Load usable invite
    const { data: invite, error: inviteErr } = await sb
      .from("invites")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (inviteErr || !invite) {
      console.error("accept_invite: load invite failed:", inviteErr);
      return NextResponse.json({ error: "Invite not found, already used, or invalid." }, { status: 404 });
    }

    // (optional) expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
    }

    // 4) Targeted invite guard
    const target = String(invite.email ?? "").toLowerCase();
    if (target && target !== String(user.email ?? "").toLowerCase()) {
      return NextResponse.json(
        { error: `This invite was sent to ${invite.email}, but you are signed in as ${user.email}.` },
        { status: 403 }
      );
    }

    // 5) Ensure profile exists (ignore conflict)
    {
      const { error } = await sb
        .from("profiles")
        .upsert({ id: user.id, email: user.email ?? null } as any, { onConflict: "id" } as any);
      if (error) {
        console.error("accept_invite: profiles upsert failed:", error);
        return NextResponse.json({ error: "Could not create your profile." }, { status: 500 });
      }
    }

    // 6) Add membership (idempotent)
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
        return NextResponse.json({ error: "Could not add you to the league." }, { status: 500 });
      }
    }

    // 7) Mark invite used (best-effort; do not fail the request)
    {
      const { error } = await sb
        .from("invites")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invite.id);
      if (error) {
        console.warn("accept_invite: marking invite used failed:", error);
      }
    }

    // 8) Done
    return NextResponse.json({ leagueId: invite.league_id });
  } catch (e: any) {
    console.error("accept_invite fatal:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error while accepting invite." },
      { status: 500 }
    );
  }
}
