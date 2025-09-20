// src/app/api/invites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = { league_id?: string; email?: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Return JSON while preserving Set-Cookie headers carried on `res`. */
function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(res.headers),
    },
  });
}

export async function POST(req: NextRequest) {
  // Initialize cookie-bound Supabase client and a response shell
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
    // body
    const body = (await req.json().catch(() => ({}))) as PostBody;
    const league_id = body.league_id?.trim();
    const email = (body.email ?? "").trim().toLowerCase();

    if (!league_id || !email) {
      return json(res, { error: "league_id and email required" }, 400);
    }
    if (!isValidEmail(email)) {
      return json(res, { error: "invalid email" }, 400);
    }

    // auth
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    if (userErr) return json(res, { error: `auth error: ${userErr.message}` }, 500);
    if (!user) return json(res, { error: "unauthenticated" }, 401);

    // must be owner/admin of this league
    const { data: membership, error: memErr } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) {
      return json(res, { error: `membership lookup failed: ${memErr.message}` }, 400);
    }
    if (!membership || !["owner", "admin"].includes(membership.role as any)) {
      return json(res, { error: "only league owner/admin can invite" }, 403);
    }

    // optional: block duplicate pending invite
    const { data: existingRow, error: exErr } = await sb
      .from("invites")
      .select("id, accepted")
      .eq("league_id", league_id)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (exErr) {
      return json(res, { error: `invite check failed: ${exErr.message}` }, 400);
    }
    if (existingRow && existingRow.accepted === false) {
      return json(res, { error: "pending invite already exists for this email" }, 409);
    }

    // create token + insert
    const token = randomUUID();
    const { error: insErr } = await sb.from("invites").insert({
      league_id,
      email,
      invited_by: user.id,
      token,
      accepted: false,
    });
    if (insErr) {
      return json(res, { error: `insert failed: ${insErr.message}` }, 400);
    }

    const acceptUrl = `/invite/${token}`;
    return json(res, { ok: true, token, acceptUrl }, 200);
  } catch (e: any) {
    return json(res, { error: e?.message ?? "unknown error" }, 500);
  }
}
