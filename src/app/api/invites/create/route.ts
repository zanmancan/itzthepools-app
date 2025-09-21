// src/app/api/invites/create/route.ts
// Owner-only invite creation with 30/min per-user rate limit.
// Supports public (no email) and private (required email) invites.
// Attempts to use created_by first; falls back to invited_by if that column exists instead.

import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes, absoluteUrl } from "@/lib/supabaseServer";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = { league_id?: string; email?: string | null; isPublic?: boolean };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isUnknownColumn(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}

export async function POST(req: NextRequest) {
  const { client, response, url } = supabaseServer(req);

  // 1) Parse JSON
  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return jsonWithRes(response, { ok: false, error: "Invalid JSON body." }, 400);
  }

  const league_id = typeof body.league_id === "string" ? body.league_id.trim() : "";
  const isPublic = Boolean(body.isPublic);
  const email =
    body.email === null
      ? null
      : typeof body.email === "string"
      ? body.email.trim()
      : undefined;

  if (!league_id) return jsonWithRes(response, { ok: false, error: "league_id is required." }, 400);
  if (!isPublic) {
    if (!email) return jsonWithRes(response, { ok: false, error: "email is required." }, 400);
    if (!isValidEmail(email)) return jsonWithRes(response, { ok: false, error: "email is invalid." }, 400);
  }

  // 2) Require auth
  const { data: auth, error: authError } = await client.auth.getUser();
  const user = auth?.user;
  if (authError || !user) return jsonWithRes(response, { ok: false, error: "Not authenticated." }, 401);

  // 3) Owner-only check
  const { data: league, error: leagueErr } = await client
    .from("leagues")
    .select("id, owner_id")
    .eq("id", league_id)
    .maybeSingle();

  if (leagueErr) {
    return jsonWithRes(
      response,
      { ok: false, error: "Failed to verify league ownership.", detail: leagueErr.message },
      500
    );
  }
  if (!league || league.owner_id !== user.id) {
    return jsonWithRes(response, { ok: false, error: "Forbidden (owner only)." }, 403);
  }

  // 4) Rate-limit: 30 in last minute by creator column (created_by or invited_by)
  const since = new Date(Date.now() - 60_000).toISOString();
  let count = 0;

  // Try created_by
  let rate = await client
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.id)
    .gte("created_at", since);

  if (rate.error && isUnknownColumn(rate.error)) {
    // Fallback invited_by
    rate = await client
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("invited_by", user.id)
      .gte("created_at", since);
  }
  if (rate.error) {
    // Don't block creation if the count query fails; just log through response payload
    count = 0;
  } else {
    count = rate.count ?? 0;
  }
  if (count >= 30) {
    return jsonWithRes(response, { ok: false, error: "Too many invites — try again in a minute." }, 429);
  }

  // 5) Insert invite (schema-flexible)
  const token = crypto.randomUUID().replace(/-/g, "");
  const baseRow: Record<string, any> = {
    league_id,
    token,
  };
  if (isPublic) {
    baseRow.email = null;
    baseRow.is_public = true;
  } else {
    baseRow.email = String(email).toLowerCase();
    baseRow.is_public = false;
  }
  // Prefer created_by; fallback to invited_by
  baseRow.created_by = user.id;
  baseRow.expires_at = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

  let ins = await client.from("invites").insert(baseRow).select("id, token").single();

  if (ins.error && isUnknownColumn(ins.error)) {
    // Remove created_by/expires_at if this schema doesn't have them, and try invited_by
    const altRow: Record<string, any> = {
      league_id,
      token,
      email: baseRow.email,
      is_public: baseRow.is_public,
      invited_by: user.id,
    };
    ins = await client.from("invites").insert(altRow).select("id, token").single();
  }

  if (ins.error) {
    return jsonWithRes(
      response,
      {
        ok: false,
        error: "Failed to create invite.",
        code: ins.error.code,
        details: ins.error.details,
        hint: ins.error.hint,
        message: ins.error.message,
      },
      500
    );
  }

  // 6) Build link and return consistent keys the UI can use
  const inviteUrl = absoluteUrl(url, `/invite/${ins.data.token}`);

  return jsonWithRes(
    response,
    {
      ok: true,
      id: ins.data.id,
      url: inviteUrl,       // primary
      acceptUrl: inviteUrl, // some UIs expect this
      link: inviteUrl,      // some UIs expect this
      token,                // convenient for debug/logging
    },
    200
  );
}
