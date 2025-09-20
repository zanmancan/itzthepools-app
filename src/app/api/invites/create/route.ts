// src/app/api/invites/create/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes, absoluteUrl } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = { league_id?: string; email?: string | null; isPublic?: boolean };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const { client, response, url } = supabaseServer(req);

  // 1) Parse & validate
  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return jsonWithRes(response, { error: "Invalid JSON body." }, 400);
  }

  const league_id = typeof body.league_id === "string" ? body.league_id.trim() : "";
  const isPublic = Boolean(body.isPublic);
  const email =
    body.email === null
      ? null
      : typeof body.email === "string"
      ? body.email.trim()
      : undefined;

  if (!league_id) return jsonWithRes(response, { error: "league_id is required." }, 400);
  if (!isPublic) {
    if (!email) return jsonWithRes(response, { error: "email is required." }, 400);
    if (!isValidEmail(email)) return jsonWithRes(response, { error: "email is invalid." }, 400);
  }

  // 2) Require auth
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) return jsonWithRes(response, { error: "Not authenticated." }, 401);

  // 3) Owner-only check (your schema has leagues.owner_id)
  const { data: league, error: leagueErr } = await client
    .from("leagues")
    .select("id, owner_id")
    .eq("id", league_id)
    .maybeSingle();

  if (leagueErr) {
    return jsonWithRes(
      response,
      { error: "Failed to verify league ownership.", detail: leagueErr.message },
      500
    );
  }
  if (!league || league.owner_id !== user.id) {
    return jsonWithRes(response, { error: "Forbidden (owner only)." }, 403);
  }

  // 4) Insert invite — "public" means email is NULL in your schema
  const token = crypto.randomUUID().replace(/-/g, "");
  const payload = {
    league_id,
    email: isPublic ? null : String(email).toLowerCase(),
    token,
    invited_by: user.id,
  };

  const { data: invite, error: insertErr } = await client
    .from("invites")
    .insert(payload)
    .select("id, token")
    .single();

  if (insertErr) {
    return jsonWithRes(
      response,
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

  // 5) Build the link and return ALL common keys so the UI can't miss it
  const inviteUrl = absoluteUrl(url, `/invite/${invite.token}`);

  return jsonWithRes(
    response,
    {
      id: invite.id,
      url: inviteUrl,           // <— primary
      acceptUrl: inviteUrl,     // <— some UIs expect this
      link: inviteUrl,          // <— some UIs expect this
      token,                    // handy for debug
    },
    200
  );
}
