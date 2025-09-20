// src/app/api/invites/create/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes, absoluteUrl } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = {
  league_id?: string;
  email?: string | null;
  isPublic?: boolean;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const { client, response, url } = supabaseRoute(req);

  // 1) Parse & validate body
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

  if (!league_id) {
    return jsonWithRes(response, { error: "league_id is required." }, 400);
  }
  if (!isPublic) {
    if (!email) return jsonWithRes(response, { error: "email is required." }, 400);
    if (!isValidEmail(email)) {
      return jsonWithRes(response, { error: "email is invalid." }, 400);
    }
  }

  // 2) Require an authenticated user
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return jsonWithRes(response, { error: "Not authenticated." }, 401);
  }

  // 3) Only owners/admins of the league can create invites
  // Assumes league_members table with (user_id, league_id, role)
  const { data: member, error: memberErr } = await client
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (memberErr) {
    return jsonWithRes(
      response,
      { error: "Failed to verify league membership.", detail: memberErr.message },
      500
    );
  }
  if (!member || !["owner", "admin"].includes(String(member.role))) {
    return jsonWithRes(response, { error: "Forbidden." }, 403);
  }

  // 4) Create an invite
  const token = crypto.randomUUID().replace(/-/g, "");
  const payload = {
    league_id,
    email: isPublic ? null : String(email).toLowerCase(),
    token,
    created_by: user.id,
    is_public: isPublic,
  };

  const { data: invite, error: insertErr } = await client
    .from("invites")
    .insert(payload)
    .select("id, token")
    .single();

  if (insertErr) {
    // Most common cause is RLS. Bubble the code & hint to make debugging fast.
    return jsonWithRes(
      response,
      {
        error: "Failed to create invite.",
        code: insertErr.code,
        hint: insertErr.hint,
        details: insertErr.details,
        message: insertErr.message,
      },
      500
    );
  }

  // 5) Return a usable URL the client can show/copy
  const inviteUrl = absoluteUrl(url, `/invite/${invite.token}`);
  return jsonWithRes(response, { id: invite.id, url: inviteUrl }, 200);
}
