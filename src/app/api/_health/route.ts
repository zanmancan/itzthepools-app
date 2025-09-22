// src/app/api/_health/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { client: sb, response: res } = supabaseRoute(req);

    // A very simple call that should succeed without auth
    const { error } = await sb.from("invites").select("id").limit(1);

    if (error) return jsonWithRes(res, { ok: false, where: "select(invites)", error: error.message }, 500);
    return jsonWithRes(res, { ok: true, message: "supabase server client OK" });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, where: "init", error: e?.message || String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
