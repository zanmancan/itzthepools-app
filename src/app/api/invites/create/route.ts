// src/app/api/invites/create/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";          // required for node:crypto on Netlify
export const dynamic = "force-dynamic";   // never cache

type PostBody = { league_id?: string; email?: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const sb = supabaseServer();

    // 1) Auth
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr) {
      return NextResponse.json({ error: `auth error: ${userErr.message}` }, { status: 500 });
    }
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    // 2) Parse + validate input
    const body = (await req.json().catch(() => ({}))) as PostBody;
    const league_id = body.league_id?.trim();
    const email = (body.email ?? "").trim().toLowerCase();

    if (!league_id || !email) {
      return NextResponse.json({ error: "league_id and email required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }

    // 3) Must be owner/admin of this league
    const { data: membership, error: memErr } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle(); // returns null if none

    if (memErr) {
      return NextResponse.json({ error: `membership lookup failed: ${memErr.message}` }, { status: 400 });
    }
    if (!membership || !["owner", "admin"].includes(membership.role as any)) {
      return NextResponse.json({ error: "only league owner/admin can invite" }, { status: 403 });
    }

    // 4) Optional: block duplicate pending invite for same email
    const { data: existingRow, error: exErr } = await sb
      .from("invites")
      .select("id, accepted")
      .eq("league_id", league_id)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .maybeSingle(); // <-- avoids array, TS-safe

    if (exErr) {
      return NextResponse.json({ error: `invite check failed: ${exErr.message}` }, { status: 400 });
    }
    if (existingRow && existingRow.accepted === false) {
      return NextResponse.json({ error: "pending invite already exists for this email" }, { status: 409 });
    }

    // 5) Create invite
    const token = randomUUID();
    const { error: insErr } = await sb.from("invites").insert({
      league_id,
      email,
      invited_by: user.id,
      token,
      accepted: false,
    });

    if (insErr) {
      return NextResponse.json({ error: `insert failed: ${insErr.message}` }, { status: 400 });
    }

    // IMPORTANT: you already route under /invite/token/[token]
    const acceptUrl = `/invite/token/${token}`;

    return NextResponse.json({ ok: true, token, acceptUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
