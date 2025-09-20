// src/app/api/invites/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = { league_id?: string; email?: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonWithRes(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...Object.fromEntries(res.headers) },
  });
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next(); // collect Set-Cookie from supabaseRoute
  try {
    const sb = supabaseRoute(req, res);

    // auth
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr) return jsonWithRes(res, { error: `auth error: ${userErr.message}` }, 500);
    if (!user) return jsonWithRes(res, { error: "unauthenticated" }, 401);

    // body
    const body = (await req.json().catch(() => ({}))) as PostBody;
    const league_id = body.league_id?.trim();
    const email = (body.email ?? "").trim().toLowerCase();
    if (!league_id || !email) return jsonWithRes(res, { error: "league_id and email required" }, 400);
    if (!isValidEmail(email)) return jsonWithRes(res, { error: "invalid email" }, 400);

    // must be owner/admin
    const { data: membership, error: memErr } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) return jsonWithRes(res, { error: `membership lookup failed: ${memErr.message}` }, 400);
    if (!membership || !["owner", "admin"].includes(membership.role as any)) {
      return jsonWithRes(res, { error: "only league owner/admin can invite" }, 403);
    }

    // optional duplicate pending check
    const { data: existing, error: exErr } = await sb
      .from("invites")
      .select("id, accepted")
      .eq("league_id", league_id)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (exErr) return jsonWithRes(res, { error: `invite check failed: ${exErr.message}` }, 400);
    if (existing && existing.accepted === false) {
      return jsonWithRes(res, { error: "pending invite already exists for this email" }, 409);
    }

    // create invite
    const token = randomUUID();
    const { error: insErr } = await sb.from("invites").insert({
      league_id,
      email,
      invited_by: user.id,
      token,
      accepted: false,
    });
    if (insErr) return jsonWithRes(res, { error: `insert failed: ${insErr.message}` }, 400);

    // return the new-style path
    const acceptUrl = `/invite/${token}`;
    return jsonWithRes(res, { ok: true, token, acceptUrl }, 200);
  } catch (e: any) {
    // Surface a helpful error to the client
    return jsonWithRes(res, { error: e?.message ?? "unknown server error" }, 500);
  }
}
