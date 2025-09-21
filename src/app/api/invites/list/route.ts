// src/app/api/invites/list/route.ts
// Owner-only: list recent invites for a league (pending first), schema-flexible.

import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUnknownColumn(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}

export async function GET(req: NextRequest) {
  const { client, response } = supabaseServer(req);
  const u = new URL(req.url);
  const league_id = (u.searchParams.get("league_id") || "").trim();
  if (!league_id) return jsonWithRes(response, { ok: false, error: "league_id is required" }, 400);

  // auth
  const { data: auth, error: authErr } = await client.auth.getUser();
  const userId = auth?.user?.id ?? null;
  if (authErr || !userId) return jsonWithRes(response, { ok: false, error: "Not authenticated." }, 401);

  // owner-only
  const { data: league, error: leagueErr } = await client
    .from("leagues")
    .select("id, owner_id")
    .eq("id", league_id)
    .maybeSingle();
  if (leagueErr) return jsonWithRes(response, { ok: false, error: leagueErr.message }, 500);
  if (!league || league.owner_id !== userId) return jsonWithRes(response, { ok: false, error: "Forbidden" }, 403);

  // Do separate queries and normalize to a single shape so TS is happy.
  type Row = {
    id: string;
    email: string | null;
    token: string;
    is_public?: boolean | null;
    accepted?: boolean | null;
    accepted_at?: string | null;
    created_at: string;
    expires_at?: string | null;
  };

  let data: Row[] = [];
  let err: any = null;

  // Try modern schema
  const modern = await client
    .from("invites")
    .select("id, email, token, is_public, accepted, accepted_at, created_at, expires_at")
    .eq("league_id", league_id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!modern.error) {
    data = (modern.data ?? []) as Row[];
  } else if (isUnknownColumn(modern.error)) {
    // Fallback to legacy subset and add missing fields
    const legacy = await client
      .from("invites")
      .select("id, email, token, accepted, created_at")
      .eq("league_id", league_id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (legacy.error) {
      err = legacy.error;
    } else {
      data = (legacy.data ?? []).map((r: any) => ({
        ...r,
        is_public: r.email == null,
        accepted_at: null,
        expires_at: null,
      })) as Row[];
    }
  } else {
    err = modern.error;
  }

  if (err) return jsonWithRes(response, { ok: false, error: err.message }, 500);

  const nowIso = new Date().toISOString();
  const rows = data.map((r) => ({
    id: r.id,
    email: r.email ?? null,
    token: r.token,
    is_public: "is_public" in r ? !!r.is_public : r.email == null,
    created_at: r.created_at,
    expires_at: "expires_at" in r ? (r.expires_at ?? null) : null,
    accepted: !!(r.accepted || r.accepted_at),
    pending: !(r.accepted || r.accepted_at) && (!r.expires_at || r.expires_at > nowIso),
  }));

  return jsonWithRes(response, { ok: true, invites: rows }, 200);
}
