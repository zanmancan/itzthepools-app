// src/app/api/admin/email-events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Return JSON while preserving Set-Cookie headers carried on `res`.
function json(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(res.headers),
    },
  });
}

/**
 * GET /api/admin/email-events?limit=50&type=delivered
 * - Returns the most recent email events from the email_events table.
 * - If your table uses slightly different column names (legacy), we return rows as-is.
 */
export async function GET(req: NextRequest) {
  let sb, res: NextResponse;
  try {
    ({ client: sb, response: res } = supabaseRoute(req));
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: `supabase init failed: ${e?.message || String(e)}` },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || 50)));
    const type = searchParams.get("type")?.trim() || null;

    // NOTE: This assumes you have a SELECT policy that allows reads for your admins (see SQL below).
    let q = sb.from("email_events").select("*").order("created_at", { ascending: false }).limit(limit);
    if (type) {
      // support either `event_type` or legacy `type`
      q = q.or(`event_type.eq.${type},type.eq.${type}`);
    }

    const { data, error } = await q;
    if (error) return json(res, { ok: false, error: error.message }, 400);

    return json(res, { ok: true, events: data ?? [] }, 200);
  } catch (e: any) {
    return json(res, { ok: false, error: e?.message ?? "Server error" }, 500);
  }
}
