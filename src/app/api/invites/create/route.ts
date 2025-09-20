import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = { league_id?: string; email?: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const res = NextResponse.next();
  try {
    const sb = supabaseRoute(req as any, res as any);

    // auth
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr) {
      return new NextResponse(JSON.stringify({ error: `auth error: ${userErr.message}` }), {
        status: 500, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }

    // parse
    const body = (await req.json().catch(() => ({}))) as PostBody;
    const league_id = body.league_id?.trim();
    const email = (body.email ?? "").trim().toLowerCase();
    if (!league_id || !email) {
      return new NextResponse(JSON.stringify({ error: "league_id and email required" }), {
        status: 400, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }
    if (!isValidEmail(email)) {
      return new NextResponse(JSON.stringify({ error: "invalid email" }), {
        status: 400, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }

    // must be owner/admin
    const { data: membership, error: memErr } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (memErr) {
      return new NextResponse(JSON.stringify({ error: `membership lookup failed: ${memErr.message}` }), {
        status: 400, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }
    if (!membership || !["owner", "admin"].includes(membership.role as any)) {
      return new NextResponse(JSON.stringify({ error: "only league owner/admin can invite" }), {
        status: 403, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }

    // optional duplicate check
    const { data: existing, error: exErr } = await sb
      .from("invites")
      .select("id, accepted")
      .eq("league_id", league_id)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .maybeSingle();
    if (exErr) {
      return new NextResponse(JSON.stringify({ error: `invite check failed: ${exErr.message}` }), {
        status: 400, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }
    if (existing && existing.accepted === false) {
      return new NextResponse(JSON.stringify({ error: "pending invite already exists for this email" }), {
        status: 409, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }

    // create invite
    const token = randomUUID();
    const { error: insErr } = await sb.from("invites").insert({
      league_id, email, invited_by: user.id, token, accepted: false,
    });
    if (insErr) {
      return new NextResponse(JSON.stringify({ error: `insert failed: ${insErr.message}` }), {
        status: 400, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
      });
    }

    // ✅ new path
    const acceptUrl = `/invite/${token}`;
    return new NextResponse(JSON.stringify({ ok: true, token, acceptUrl }), {
      status: 200, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
    });
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ error: e?.message ?? "unknown error" }), {
      status: 500, headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
    });
  }
}
