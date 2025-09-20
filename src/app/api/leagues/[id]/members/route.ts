// src/app/api/leagues/[id]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
  });
}

/** GET → list members for a league (visible to any member) */
export async function GET(req: NextRequest, { params }: Params) {
  const res = NextResponse.next();
  try {
    const league_id = params.id;
    const sb = supabaseRoute(req, res);
    const { data: { user }, error: uerr } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    // Must be a member to view members
    const { data: me } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!me) return json(res, { error: "Forbidden" }, 403);

    const { data, error } = await sb
      .from("league_members")
      .select("user_id, role, profiles: user_id ( id, email, display_name )")
      .eq("league_id", league_id)
      .order("role", { ascending: true });

    if (error) return json(res, { error: error.message }, 400);
    return json(res, { ok: true, members: data ?? [] });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
