// src/app/api/leagues/[id]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

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

/** GET → list members for league */
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

    const { data, error } = await sb
      .from("league_members")
      .select(
        `
        league_id,
        user_id,
        role,
        inserted_at,
        profiles:user_id ( id, email, team_name )
      `
      )
      .eq("league_id", league_id)
      .order("inserted_at", { ascending: true });

    if (error) return json(res, { error: error.message }, 400);
    return json(res, { ok: true, members: data ?? [] });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
