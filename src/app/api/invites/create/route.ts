// src/app/api/invites/create/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes, absoluteUrl } from "@/lib/supabaseServer";
import { devlog, devtime, devtimeEnd, deverror } from "@/lib/devlog";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adjust as needed; we chose a higher ceiling per your note
const LIMIT_PER_MIN = 30;

type PostBody = {
  league_id?: string;
  email?: string | null;
  isPublic?: boolean;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const { client: sb, response: res, url } = supabaseServer(req);

  // 1) Parse & validate
  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return jsonWithRes(res, { error: "Invalid JSON body." }, 400);
  }

  const league_id = typeof body.league_id === "string" ? body.league_id.trim() : "";
  const isPublic = Boolean(body.isPublic);
  const email =
    body.email === null
      ? null
      : typeof body.email === "string"
      ? body.email.trim()
      : undefined;

  if (!league_id) return jsonWithRes(res, { error: "league_id is required." }, 400);
  if (!isPublic) {
    if (!email) return jsonWithRes(res, { error: "email is required." }, 400);
    if (!isValidEmail(email)) return jsonWithRes(res, { error: "email is invalid." }, 400);
  }

  // 2) Require auth
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();
  if (authError || !user) return jsonWithRes(res, { error: "Not authenticated." }, 401);

  devlog("[invites:create] request", { league_id, isPublic, email, user: user.id });

  // 3) Owner-only check (your schema has leagues.owner_id)
  const { data: league, error: leagueErr } = await sb
    .from("leagues")
    .select("id, owner_id")
    .eq("id", league_id)
    .maybeSingle();

  if (leagueErr) {
    deverror("[invites:create] verify ownership failed", leagueErr);
    return jsonWithRes(
      res,
      { error: "Failed to verify league ownership.", detail: leagueErr.message },
      500
    );
  }
  if (!league || league.owner_id !== user.id) {
    devlog("[invites:create] forbidden (owner only)", { league_id, owner: league?.owner_id, user: user.id });
    return jsonWithRes(res, { error: "Forbidden (owner only)." }, 403);
  }

  // 4) Lightweight per-minute rate limit (by inviter)
  devtime("invites:create:ratelimit");
  const { count: recentCount, error: countErr } = await sb
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", user.id)
    .gt("created_at", new Date(Date.now() - 60_000).toISOString());

  devtimeEnd("invites:create:ratelimit");
  if (countErr) {
    deverror("[invites:create] rate-limit count failed", countErr);
    return jsonWithRes(res, { error: "Rate-limit check failed." }, 500);
  }
  if ((recentCount ?? 0) >= LIMIT_PER_MIN) {
    devlog("[invites:create] rate-limited", { recentCount, LIMIT_PER_MIN });
    return jsonWithRes(
      res,
      { error: `Invite limit reached. Try again in a minute. (${LIMIT_PER_MIN}/min)` },
      429
    );
  }

  // 5) Insert invite — "public" means email is NULL in your schema
  const token = crypto.randomUUID().replace(/-/g, "");
  const payload = {
    league_id,
    email: isPublic ? null : String(email).toLowerCase(),
    token,
    invited_by: user.id,
  };

  devtime("invites:create:insert");
  const { data: invite, error: insertErr } = await sb
    .from("invites")
    .insert(payload)
    .select("id, token")
    .single();
  devtimeEnd("invites:create:insert");

  if (insertErr) {
    deverror("[invites:create] insert failed", insertErr, { payload });
    return jsonWithRes(
      res,
      {
        error: "Failed to create invite.",
        code: insertErr.code,
        details: insertErr.details,
        hint: insertErr.hint,
        message: insertErr.message,
      },
      500
    );
  }

  // 6) Build and return link
  const inviteUrl = absoluteUrl(url, `/invite/${invite.token}`);
  devlog("[invites:create] success", { invite_id: invite.id, token: invite.token });

  return jsonWithRes(
    res,
    {
      id: invite.id,
      url: inviteUrl,       // primary
      acceptUrl: inviteUrl, // some UIs expect this
      link: inviteUrl,      // some UIs expect this
      token,                // handy for debug
    },
    200
  );
}
