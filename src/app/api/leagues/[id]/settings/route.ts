// src/app/api/leagues/[id]/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };
type Body = { name?: string; season?: string | null; ruleset?: string | null; is_public?: boolean };

function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const res = NextResponse.next();
  try {
    const league_id = params.id;
    const body = (await req.json().catch(() => ({}))) as Body;

    const payload: Record<string, any> = {};
    if (typeof body.name === "string") payload.name = body.name.trim();
    if ("season" in body) payload.season = body.season ?? null;
    if ("ruleset" in body) payload.ruleset = body.ruleset ?? null;
    if ("is_public" in body) payload.is_public = Boolean(body.is_public);

    if (!Object.keys(payload).length) return json(res, { error: "No fields to update" }, 400);

    const sb = supabaseRoute(req, res);

    const { data: { user }, error: uerr } = await sb.auth.getUser();
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

    const { error } = await sb.from("leagues").update(payload).eq("id", league_id);
    if (error) return json(res, { error: error.message }, 400);

    return json(res, { ok: true });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
