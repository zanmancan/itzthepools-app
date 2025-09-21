// src/app/api/invites/token/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { token: string } };

/** JSON helper that preserves any headers (incl. Set-Cookie) written on `res`. */
function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(res.headers),
    },
  });
}

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
    const { data: inv, error } = await sb
      .from("invites")
      .select(
        "id, league_id, email, invited_by, token, accepted, created_at, expires_at, revoked_at"
      )
      .eq("token", params.token)
      .maybeSingle();

    if (error) return json(res, { error: error.message }, 400);
    if (!inv)  return json(res, { error: "Invite not found", reason: "invalid" }, 404);

    // Hardening: block revoked, expired, or already used tokens
    if (inv.revoked_at) {
      return json(res, { error: "Invite has been revoked", reason: "revoked" }, 410);
    }

    if (inv.expires_at && new Date(inv.expires_at).getTime() <= Date.now()) {
      return json(res, { error: "Invite has expired", reason: "expired" }, 410);
    }

    if (inv.accepted) {
      return json(res, { error: "Invite already used", reason: "used" }, 409);
    }

    // Success — return only what the client needs
    const safe = {
      id: inv.id,
      league_id: inv.league_id,
      email: inv.email,
      token: inv.token,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
    };

    return json(res, { ok: true, invite: safe }, 200);
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
