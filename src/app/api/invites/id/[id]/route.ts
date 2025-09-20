// src/app/api/invites/id/[id]/route.ts
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

export async function GET(req: NextRequest, { params }: Params) {
  const res = NextResponse.next();
  try {
    const sb = supabaseRoute(req, res);
    const { data: { user }, error: uerr } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    const { data, error } = await sb
      .from("invites")
      .select("id, league_id, email, invited_by, token, accepted, created_at")
      .eq("id", params.id)
      .maybeSingle();

    if (error) return json(res, { error: error.message }, 400);
    if (!data) return json(res, { error: "Invite not found" }, 404);

    // Visibility: owner/admin of league or inviter can view
    const { data: lm } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", data.league_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const canView = lm && ["owner", "admin"].includes(lm.role as any) || data.invited_by === user.id;
    if (!canView) return json(res, { error: "Forbidden" }, 403);

    return json(res, { ok: true, invite: data });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const res = NextResponse.next();
  try {
    const sb = supabaseRoute(req, res);
    const { data: { user }, error: uerr } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { error: "Unauthorized" }, 401);

    // load invite first to check permissions
    const { data: inv, error } = await sb
      .from("invites")
      .select("id, league_id, invited_by, accepted")
      .eq("id", params.id)
      .maybeSingle();

    if (error) return json(res, { error: error.message }, 400);
    if (!inv) return json(res, { error: "Invite not found" }, 404);
    if (inv.accepted) return json(res, { error: "Invite already used" }, 409);

    const { data: lm } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", inv.league_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const canDelete = lm && ["owner", "admin"].includes(lm.role as any) || inv.invited_by === user.id;
    if (!canDelete) return json(res, { error: "Forbidden" }, 403);

    const { error: delErr } = await sb.from("invites").delete().eq("id", params.id);
    if (delErr) return json(res, { error: delErr.message }, 400);

    return json(res, { ok: true });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
