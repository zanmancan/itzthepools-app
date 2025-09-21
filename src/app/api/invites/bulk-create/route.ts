// src/app/api/invites/bulk-create/route.ts
// Bulk create private invites (10–50 emails per request).
// - Owner-only
// - 30 invites/min rate limit per creator
// - Schema-flexible (created_by/is_public/expires_at preferred; falls back to invited_by)
// - Skips duplicates: existing, unaccepted & unexpired invites for the same (league_id, email)

import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes, absoluteUrl } from "@/lib/supabaseServer";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = {
  league_id?: string;
  emails?: string[] | string; // CSV string or array
  expiresDays?: number;       // default 14 (1..60)
};

const LIMIT_PER_MIN = 30;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isUnknownColumn(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}
function normalizeEmails(input: string[] | string | undefined): string[] {
  if (!input) return [];
  const raw = Array.isArray(input)
    ? input
    : String(input)
        .split(/[,\n;]/g)
        .map((s) => s.trim());
  const lowered = raw.map((e) => e.toLowerCase()).filter(Boolean);
  return Array.from(new Set(lowered)); // de-dupe within request
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
  const expiresDays = Number.isFinite(body.expiresDays)
    ? Math.max(1, Math.min(60, Number(body.expiresDays)))
    : 14;

  if (!league_id) return jsonWithRes(response, { ok: false, error: "league_id is required." }, 400);

  // Emails (private invites only for bulk)
  const emails = normalizeEmails(body.emails);
  if (emails.length === 0) {
    return jsonWithRes(response, { ok: false, error: "emails are required." }, 400);
  }
  if (emails.length > 50) {
    return jsonWithRes(response, { ok: false, error: "Max 50 emails per request." }, 400);
  }

  // Validate format
  const invalidSet = new Set<string>();
  const validEmails = emails.filter((e) => {
    const ok = isValidEmail(e);
    if (!ok) invalidSet.add(e);
    return ok;
  });

  // 2) Require auth (extract a non-null userId for TS)
  const { data: auth, error: authError } = await client.auth.getUser();
  const userId = auth?.user?.id ?? null;
  if (authError || !userId) return jsonWithRes(response, { ok: false, error: "Not authenticated." }, 401);

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
  if (!league || league.owner_id !== userId) {
    return jsonWithRes(response, { ok: false, error: "Forbidden (owner only)." }, 403);
  }

  // 4) Rate-limit: 30/min per creator (count this batch)
  const since = new Date(Date.now() - 60_000).toISOString();
  let existingCount = 0;

  // Try created_by first
  let rate = await client
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte("created_at", since);

  if (rate.error && isUnknownColumn(rate.error)) {
    // Fallback invited_by
    rate = await client
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("invited_by", userId)
      .gte("created_at", since);
  }
  existingCount = rate.error ? 0 : (rate.count ?? 0);

  if (existingCount + validEmails.length > LIMIT_PER_MIN) {
    return jsonWithRes(
      response,
      {
        ok: false,
        error: `Rate limit exceeded. You can create at most ${LIMIT_PER_MIN} invites/min.`,
        detail: { createdInLastMinute: existingCount, requested: validEmails.length, limit: LIMIT_PER_MIN },
      },
      429
    );
  }

  // 5) Skip duplicates: normalize result shape so TS doesn't choke
  type DupRow = { id: string; email: string | null; accepted?: boolean | null; expires_at?: string | null };

  let dupData: DupRow[] = [];
  let dupErr: any = null;

  // Try modern selection (includes expires_at)
  {
    const { data, error } = await client
      .from("invites")
      .select("id, email, accepted, expires_at")
      .eq("league_id", league_id)
      .in("email", validEmails)
      .limit(1000);
    if (!error) {
      dupData = (data as any[]) as DupRow[];
    } else if (isUnknownColumn(error)) {
      // Fallback: without expires_at
      const res2 = await client
        .from("invites")
        .select("id, email, accepted")
        .eq("league_id", league_id)
        .in("email", validEmails)
        .limit(1000);
      dupErr = res2.error;
      dupData = (res2.data ?? []).map((r: any) => ({ ...r, expires_at: null })) as DupRow[];
    } else {
      dupErr = error;
    }
  }

  if (dupErr && !isUnknownColumn(dupErr)) {
    // We couldn't fetch duplicates but it's not a shape issue — continue anyway (best effort)
  }

  const nowIso = new Date().toISOString();
  const duplicateEmails = new Set<string>(
    dupData
      .filter((r) => {
        const unaccepted = r.accepted === false || r.accepted == null; // legacy + modern
        const notExpired = !r.expires_at || r.expires_at > nowIso;
        return unaccepted && notExpired;
      })
      .map((r) => String(r.email || "").toLowerCase())
  );

  const toCreate = validEmails.filter((e) => !duplicateEmails.has(e));

  // 6) Prepare rows (prefer modern columns)
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 3600 * 1000).toISOString();
  const rows = toCreate.map((email) => ({
    league_id,
    email,
    token: crypto.randomUUID().replace(/-/g, ""),
    is_public: false,
    created_by: userId,
    expires_at: expiresAt,
  }));

  // 7) Insert (schema-flexible): try modern first; fallback to invited_by
  async function insertBatch(batch: any[]) {
    let ins = await client.from("invites").insert(batch).select("id, token, email");
    if (ins.error && isUnknownColumn(ins.error)) {
      const alt = batch.map(({ league_id, email, token }: any) => ({
        league_id,
        email,
        token,
        invited_by: userId,
      }));
      ins = await client.from("invites").insert(alt).select("id, token, email");
    }
    return ins;
  }

  const created: Array<{ email: string; token: string; url: string }> = [];
  if (rows.length > 0) {
    const ins = await insertBatch(rows);
    if (ins.error) {
      return jsonWithRes(
        response,
        {
          ok: false,
          error: "Failed to create invites.",
          code: ins.error.code,
          details: ins.error.details,
          hint: ins.error.hint,
          message: ins.error.message,
        },
        500
      );
    }
    for (const r of ins.data ?? []) {
      created.push({
        email: String(r.email),
        token: String(r.token),
        url: absoluteUrl(url, `/invite/${r.token}`),
      });
    }
  }

  // 8) Build per-email results
  const results = emails.map((raw) => {
    const e = raw.toLowerCase();
    if (invalidSet.has(e)) return { email: e, status: "invalid" as const, reason: "invalid_format" as const };
    if (duplicateEmails.has(e)) return { email: e, status: "duplicate" as const };
    const found = created.find((c) => c.email === e);
    if (found) return { email: e, status: "created" as const, token: found.token, url: found.url };
    return { email: e, status: "unknown" as const };
  });

  const summary = {
    total: emails.length,
    valid: validEmails.length,
    created: created.length,
    duplicates: duplicateEmails.size,
    invalid: invalidSet.size,
    remainingRateLimit: Math.max(0, LIMIT_PER_MIN - existingCount - validEmails.length),
  };

  return jsonWithRes(response, { ok: true, summary, results }, 200);
}
