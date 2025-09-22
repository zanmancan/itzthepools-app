// src/app/api/leagues/[id]/team-name-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(res: NextResponse, body: unknown, status = 200) {
  // forward any Set-Cookie headers from the supabaseRoute() temp response
  const out = new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
  res.headers.forEach((v, k) => {
    if (k.toLowerCase() === "set-cookie") out.headers.append("set-cookie", v);
  });
  return out;
}

export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  let sb, res: NextResponse;
  try {
    ({ client: sb, response: res } = supabaseRoute(req));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Init failed" }, { status: 500 });
  }

  const leagueId = (ctx.params?.id || "").trim();
  const name = (new URL(req.url).searchParams.get("name") || "").trim();

  if (!leagueId) return json(res, { available: false, error: "Missing league id." }, 400);
  if (!name)     return json(res, { available: false, error: "Missing name." }, 400);

  // Case-insensitive exact match within a league (use ILIKE without wildcards)
  const { data, error } = await (sb.from("league_members") as any)
    .select("id")
    .eq("league_id", leagueId)
    .ilike("team_name", name) // ILIKE <no %> -> exact, case-insensitive
    .limit(1);

  if (error) return json(res, { available: false, error: error.message }, 400);

  const taken = Array.isArray(data) && data.length > 0;
  return json(res, { ok: true, available: !taken });
}
