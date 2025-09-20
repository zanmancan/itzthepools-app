// src/app/api/league-name/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { league_id?: string; name?: string };

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
    // Parse body safely
    let league_id: string | undefined;
    let name: string | undefined;
    try {
      const body = (await req.json()) as Body;
      league_id = body.league_id?.trim();
      name = body.name?.trim();
    } catch {
      // ignored; handled by validation below
    }

    if (!league_id || !name) {
      return json(res, { error: "league_id and name required" }, 400);
    }

    // Auth
    const {
      data: { user },
      error: uerr,
    } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    // Must be owner/admin
    const { data: lm } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lm || !["owner", "admin"].includes(lm.role as any)) {
      return json(res, { error: "Forbidden" }, 403);
    }

    // Update league name
    const { error } = await sb.from("leagues").update({ name }).eq("id", league_id);
    if (error) return json(res, { error: error.message }, 400);

    return json(res, { ok: true });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
