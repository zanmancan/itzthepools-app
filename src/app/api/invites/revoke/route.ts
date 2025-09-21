// src/app/api/invites/revoke/route.ts
// Owner-only: revoke by token or id (sets expires_at to now; falls back to delete if column missing)
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUnknownColumn(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}

type Body = { league_id?: string; token?: string; id?: string };

export async function POST(req: NextRequest) {
  const { client, response } = supabaseServer(req);
  let body: Body = {};
  try { body = await req.json(); } catch {}
  const league_id = String(body.league_id || "").trim();
  const token = String(body.token || "").trim();
  const id = String(body.id || "").trim();
  if (!league_id || (!token && !id))
    return jsonWithRes(response, { ok: false, error: "league_id and token|id are required" }, 400);

  const { data: auth, error: authErr } = await client.auth.getUser();
  const userId = auth?.user?.id ?? null;
  if (authErr || !userId) return jsonWithRes(response, { ok: false, error: "Not authenticated." }, 401);

  const { data: league, error: leagueErr } = await client
    .from("leagues")
    .select("id, owner_id")
    .eq("id", league_id)
    .maybeSingle();
  if (leagueErr) return jsonWithRes(response, { ok: false, error: leagueErr.message }, 500);
  if (!league || league.owner_id !== userId) return jsonWithRes(response, { ok: false, error: "Forbidden" }, 403);

  const match = token ? { token } : { id };

  // Try modern "expires_at = now()"
  let upd = await client.from("invites").update({ expires_at: new Date().toISOString() }).match(match);
  if (upd.error && isUnknownColumn(upd.error)) {
    // Fallback: delete row
    upd = await client.from("invites").delete().match(match);
  }
  if (upd.error) return jsonWithRes(response, { ok: false, error: upd.error.message }, 500);
  return jsonWithRes(response, { ok: true }, 200);
}
