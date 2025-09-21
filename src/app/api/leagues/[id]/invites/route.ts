// src/app/api/leagues/[id]/invites/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";
import { devlog, deverror } from "@/lib/devlog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  const { client: sb, response: res } = supabaseServer(req);
  const leagueId = params.id;

  // auth
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr || !user) return jsonWithRes(res, { error: "Not authenticated." }, 401);

  // owner/admin gate
  const { data: lm, error: lmErr } = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lmErr) {
    deverror("[invites:list] membership lookup failed", lmErr);
    return jsonWithRes(res, { error: "Failed to verify permissions." }, 500);
  }
  if (!lm || !["owner", "admin"].includes(lm.role as any)) {
    return jsonWithRes(res, { error: "Forbidden" }, 403);
  }

  // fetch invites
  const { data, error } = await sb
    .from("invites")
    .select(
      "id, token, email, invited_by, created_at, expires_at, accepted, accepted_at, revoked_at"
    )
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false });

  if (error) {
    deverror("[invites:list] fetch failed", error);
    return jsonWithRes(res, { error: "Failed to load invites." }, 500);
  }

  const now = new Date();
  const open: any[] = [];
  const accepted: any[] = [];
  const denied: any[] = []; // revoked/expired; API omits public from this bucket

  for (const row of data ?? []) {
    const isPublic = row.email == null;
    const isRevoked = !!row.revoked_at;
    const isAccepted = !!row.accepted;
    const isExpired = row.expires_at ? new Date(row.expires_at) <= now : false;

    const base = {
      id: row.id as string,
      token: row.token as string,
      email: row.email as string | null,
      isPublic,
      created_at: row.created_at as string,
      expires_at: row.expires_at as string | null,
      accepted_at: row.accepted_at as string | null,
      revoked_at: row.revoked_at as string | null,
    };

    if (isAccepted) {
      accepted.push(base);
    } else if (!isRevoked && !isExpired) {
      open.push(base);
    } else {
      if (!isPublic) denied.push(base); // hide "denied" for public invites
    }
  }

  devlog("[invites:list]", {
    leagueId,
    counts: { open: open.length, accepted: accepted.length, denied: denied.length },
  });

  return jsonWithRes(res, { ok: true, open, accepted, denied }, 200);
}
