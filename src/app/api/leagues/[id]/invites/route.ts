// src/app/api/leagues/[id]/invites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

/** JSON helper that preserves Set-Cookie headers from `res`. */
function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(res.headers),
    },
  });
}

function validEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** GET → list invites for league (owner/admin see all; others see their own) */
export async function GET(req: NextRequest, { params }: Params) {
  let sb, res: NextResponse;
  try {
    ({ client: sb, response: res } = supabaseRoute(req));
  } catch (e: any) {
    return NextResponse.json(
      { error: `supabase client init failed: ${e?.message || String(e)}` },
      { status: 500 }
    );
  }

  try {
    const league_id = params.id;

    const {
      data: { user },
      error: uerr,
    } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    const { data: lm } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const isOwner = lm && ["owner", "admin"].includes(lm.role as any);

    const q = sb
      .from("invites")
      .select("id, league_id, email, invited_by, token, accepted, created_at")
      .eq("league_id", league_id)
      .order("created_at", { ascending: false });

    const { data, error } = isOwner ? await q : await q.eq("invited_by", user.id);
    if (error) return json(res, { error: error.message }, 400);

    return json(res, { ok: true, invites: data ?? [] });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}

/** POST { email } → create invite (owner/admin only) */
export async function POST(req: NextRequest, { params }: Params) {
  let sb, res: NextResponse;
  try {
    ({ client: sb, response: res } = supabaseRoute(req));
  } catch (e: any) {
    return NextResponse.json(
      { error: `supabase client init failed: ${e?.message || String(e)}` },
      { status: 500 }
    );
  }

  try {
    const league_id = params.id;

    let email: string | undefined;
    try {
      const body = (await req.json()) as { email?: string };
      email = body.email?.trim();
    } catch {
      /* ignored; validated below */
    }

    if (!email || !validEmail(email)) return json(res, { error: "valid email required" }, 400);

    const {
      data: { user },
      error: uerr,
    } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    const { data: lm } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lm || !["owner", "admin"].includes(lm.role as any)) {
      return json(res, { error: "Forbidden" }, 403);
    }

    // prevent duplicate pending invite
    const { data: existing, error: exErr } = await sb
      .from("invites")
      .select("id, accepted")
      .eq("league_id", league_id)
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (exErr) return json(res, { error: `invite check failed: ${exErr.message}` }, 400);
    if (existing && existing.accepted === false) {
      return json(res, { error: "pending invite already exists for this email" }, 409);
    }

    const token = randomUUID().replace(/-/g, "");
    const { error: insErr } = await sb.from("invites").insert({
      league_id,
      email: email.toLowerCase(),
      invited_by: user.id,
      token,
      accepted: false,
    });
    if (insErr) return json(res, { error: `insert failed: ${insErr.message}` }, 400);

    return json(res, { ok: true, token, acceptUrl: `/invite/${token}` });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
