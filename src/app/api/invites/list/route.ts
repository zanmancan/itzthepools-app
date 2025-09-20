// src/app/api/invites/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const { searchParams } = new URL(req.url);
    const league_id = searchParams.get("league_id")?.trim();
    if (!league_id) return json(res, { error: "league_id required" }, 400);

    const {
      data: { user },
      error: uerr,
    } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    // Determine permissions
    const { data: lm } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const isOwnerOrAdmin = lm && ["owner", "admin"].includes(lm.role as any);

    // Owner/admin see all invites; others only see the invites they created
    const base = sb
      .from("invites")
      .select("id, league_id, email, invited_by, token, accepted, created_at")
      .eq("league_id", league_id)
      .order("created_at", { ascending: false });

    const { data, error } = isOwnerOrAdmin ? await base : await base.eq("invited_by", user.id);
    if (error) return json(res, { error: error.message }, 400);

    return json(res, { ok: true, invites: data ?? [] });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
