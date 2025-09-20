// src/app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
  });
}

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  try {
    const sb = supabaseRoute(req, res);
    const { data: { user }, error: uerr } = await sb.auth.getUser();
    if (uerr) return json(res, { error: uerr.message }, 500);
    if (!user) return json(res, { ok: true, user: null });

    // profiles table may differ; adjust columns as needed
    const { data: profile } = await sb
      .from("profiles")
      .select("id, email, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const { data: roles } = await sb
      .from("league_members")
      .select("league_id, role")
      .eq("user_id", user.id);

    return json(res, {
      ok: true,
      user: { id: user.id, email: user.email },
      profile: profile ?? null,
      roles: roles ?? [],
    });
  } catch (e: any) {
    return json(res, { error: e?.message ?? "Server error" }, 500);
  }
}
