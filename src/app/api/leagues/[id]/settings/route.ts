// src/app/api/leagues/[id]/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };
type Body = {
  name?: string;
  season?: string | null;
  ruleset?: string | null;
  is_public?: boolean;
};

/** JSON helper that preserves Set-Cookie headers from the Supabase response */
function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(res.headers),
    },
  });
}

/** PATCH → owner updates league settings */
export async function PATCH(req: NextRequest, { params }: Params) {
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
    const body = (await req.json().catch(() => ({}))) as Body;

    const payload: Record<string, any> = {};
    if (typeof body.name === "string") payload.name = body.name.trim();
    if ("season" in body) payload.season = body.season ?? null;
    if ("ruleset" in body) payload.ruleset = body.ruleset ?? null;
    if ("is_public" in body) payload.is_public = !!body.is_public;

    if (Object.keys(payload).length === 0) return json(res, { error: "No fields to update" }, 400);

    // auth + owner check
    const {
      data: { user },
      error: uerr,
    } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    const { data: league, error: lerr } = await sb
      .from("leagues")
      .select("id, owner_id")
      .eq("id", league_id)
      .maybeSingle();

    if (lerr) return json(res, { error: lerr.message }, 400);
    if (!league || league.owner_id !== user.id) return json(res, { error: "Forbidden" }, 403);

    const { data: updated, error: upErr } = await sb
      .from("leagues")
      .update(payload)
      .eq("id", league_id)
      .select("id, name, season, ruleset, is_public")
      .maybeSingle();

    if (upErr) return json(res, { error: upErr.message }, 400);

    return json(res, { ok: true, league: updated });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
