// src/app/api/league-name/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { league_id?: string; name?: string };

function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
  });
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  try {
    const { league_id, name } = (await req.json().catch(() => ({}))) as Body;
    if (!league_id || !name) return json(res, { error: "league_id and name required" }, 400);

    const sb = supabaseRoute(req, res);

    const { data: { user }, error: uerr } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    // must be owner/admin
    const { data: lm } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lm || !["owner", "admin"].includes(lm.role as any)) {
      return json(res, { error: "Forbidden" }, 403);
    }

    const { error } = await sb.from("leagues").update({ name }).eq("id", league_id);
    if (error) return json(res, { error: error.message }, 400);

    return json(res, { ok: true });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
