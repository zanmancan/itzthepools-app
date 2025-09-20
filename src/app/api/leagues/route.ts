// src/app/api/leagues/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Helper that preserves Set-Cookie headers coming from the Supabase client */
function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(res.headers),
    },
  });
}

/** GET → leagues for current user */
export async function GET(req: NextRequest) {
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
    const {
      data: { user },
      error: uerr,
    } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    const { data, error } = await sb
      .from("league_members")
      .select("role, leagues:league_id ( id, name, season, ruleset, is_public )")
      .eq("user_id", user.id)
      .order("role", { ascending: true });

    if (error) return json(res, { error: error.message }, 400);
    return json(res, { ok: true, rows: data ?? [] });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}

/** POST { name, season?, ruleset?, is_public? } → create league + owner membership */
export async function POST(req: NextRequest) {
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
    const {
      data: { user },
      error: uerr,
    } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    const body = (await req.json().catch(() => ({} as any))) as {
      name?: string;
      season?: string | null;
      ruleset?: string | null;
      is_public?: boolean;
    };

    const name = (body.name ?? "").trim();
    const season = (body.season ?? null) as string | null;
    const ruleset = (body.ruleset ?? null) as string | null;
    const is_public = Boolean(body.is_public ?? false);

    if (!name) return json(res, { error: "name required" }, 400);

    const { data: league, error: insErr } = await sb
      .from("leagues")
      .insert({ name, season, ruleset, is_public })
      .select("id, name, season, ruleset, is_public")
      .single();

    if (insErr) return json(res, { error: insErr.message }, 400);

    const { error: memErr } = await sb
      .from("league_members")
      .insert({ league_id: league.id, user_id: user.id, role: "owner" });

    if (memErr) return json(res, { error: `membership failed: ${memErr.message}` }, 400);

    return json(res, { ok: true, league });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
