// src/app/api/invites/token/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { token: string } };

function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  const res = NextResponse.next();
  try {
    const sb = supabaseRoute(req, res);

    const { data, error } = await sb
      .from("invites")
      .select("id, league_id, email, invited_by, token, accepted, created_at")
      .eq("token", params.token)
      .maybeSingle();

    if (error) return json(res, { error: error.message }, 400);
    if (!data) return json(res, { error: "Invite not found" }, 404);

    return json(res, { ok: true, invite: data });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
