// src/app/api/invites/bulk-create/route.ts
import { NextRequest } from "next/server";
import { supabaseServer, jsonWithRes, absoluteUrl } from "@/lib/supabaseServer";
import { devlog, devtime, devtimeEnd, deverror } from "@/lib/devlog";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT_PER_MIN = 30;

type Body = {
  league_id?: string;
  emails?: string[]; // raw list from UI
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const { client: sb, response: res, url } = supabaseServer(req);

  // 1) Parse body
  let body: Body | null = null;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonWithRes(res, { ok: false, error: "Invalid JSON body." }, 400);
  }
  const league_id = (body?.league_id || "").trim();
  const rawEmails = Array.isArray(body?.emails) ? body!.emails : [];

  if (!league_id) return jsonWithRes(res, { ok: false, error: "league_id is required." }, 400);
  if (rawEmails.length === 0) return jsonWithRes(res, { ok: false, error: "emails are required." }, 400);

  // 2) Auth
  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();
  if (authErr || !user) return jsonWithRes(res, { ok: false, error: "Not authenticated." }, 401);

  devlog("[invites:bulk-create] request", { league_id, count: rawEmails.length, user: user.id });

  // 3) Owner check
  const { data: league, error: leagueErr } = await sb
    .from("leagues")
    .select("id, owner_id")
    .eq("id", league_id)
    .maybeSingle();
  if (leagueErr) {
    deverror("[invites:bulk-create] verify ownership failed", leagueErr);
    return jsonWithRes(res, { ok: false, error: "Failed to verify league ownership." }, 500);
  }
  if (!league || league.owner_id !== user.id) {
    return jsonWithRes(res, { ok: false, error: "Forbidden (owner only)." }, 403);
  }

  // 4) Normalize + validate emails
  const cleaned = rawEmails
    .map((e) => String(e || "").trim().toLowerCase())
    .filter(Boolean);
  const uniqueInput = Array.from(new Set(cleaned));
  const invalid = uniqueInput.filter((e) => !isValidEmail(e));
  const valid = uniqueInput.filter((e) => isValidEmail(e));

  // 5) Rate-limit headroom
  devtime("invites:bulk-create:ratelimit");
  const { count: recentCount, error: countErr } = await sb
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", user.id)
    .gt("created_at", new Date(Date.now() - 60_000).toISOString());
  devtimeEnd("invites:bulk-create:ratelimit");
  if (countErr) {
    deverror("[invites:bulk-create] rate-limit count failed", countErr);
    return jsonWithRes(res, { ok: false, error: "Rate-limit check failed." }, 500);
  }
  const remaining = Math.max(0, LIMIT_PER_MIN - (recentCount ?? 0));
  if (valid.length > remaining) {
    devlog("[invites:bulk-create] rate-limited", { recentCount, remaining, requested: valid.length });
    return jsonWithRes(
      res,
      { ok: false, error: `Invite limit reached. You can create ${remaining} more in the next minute.` },
      429
    );
  }

  // 6) Avoid duplicates for emails already invited for this league and not yet accepted
  devtime("invites:bulk-create:load-existing");
  const { data: existingInvites, error: exErr } = await sb
    .from("invites")
    .select("email, accepted")
    .eq("league_id", league_id)
    .is("email", null) // don't mix with public invites; we only compare email invites
    .not("email", "is", null); // (safety: in case the null filter differs across versions)
  devtimeEnd("invites:bulk-create:load-existing");
  // Note: Some SB versions dislike double `is/null` combos; safe-guard below:
  const existingSet = new Set(
    (existingInvites || [])
      .filter((i) => !!i.email && !i.accepted)
      .map((i) => String(i.email).toLowerCase())
  );

  const dedupedToCreate = valid.filter((e) => !existingSet.has(e));
  const duplicates = valid.filter((e) => existingSet.has(e));

  // 7) Create tokens + payloads
  const now = new Date();
  const payloads = dedupedToCreate.map((e) => ({
    league_id,
    email: e,
    token: crypto.randomUUID().replace(/-/g, ""),
    invited_by: user.id,
    created_at: now.toISOString(), // helpful when doing head counts with gt()
  }));

  // 8) Bulk insert
  devtime("invites:bulk-create:insert");
  const { data: ins, error: insErr } = await sb
    .from("invites")
    .insert(payloads)
    .select("id, email, token, created_at");
  devtimeEnd("invites:bulk-create:insert");

  if (insErr) {
    deverror("[invites:bulk-create] insert failed", insErr, { size: payloads.length });
    return jsonWithRes(
      res,
      {
        ok: false,
        error: "Failed to create invites.",
        code: insErr.code,
        details: insErr.details,
        hint: insErr.hint,
        message: insErr.message,
      },
      500
    );
  }

  // 9) Build per-email results
  const created = (ins || []).map((r) => ({
    email: String(r.email),
    token: String(r.token),
    url: absoluteUrl(url, `/invite/${r.token}`),
  }));

  const results = uniqueInput.map((e) => {
    if (!isValidEmail(e)) return { email: e, status: "invalid" as const, reason: "invalid_format" as const };
    const dup = duplicates.includes(e);
    if (dup) return { email: e, status: "duplicate" as const };
    const found = created.find((c) => c.email === e);
    if (found) return { email: e, status: "created" as const, token: found.token, url: found.url };
    return { email: e, status: "unknown" as const }; // guard
  });

  const summary = {
    total: uniqueInput.length,
    valid: valid.length,
    created: created.length,
    duplicates: duplicates.length,
    invalid: invalid.length,
    limitRemaining: Math.max(0, remaining - created.length),
  };

  devlog("[invites:bulk-create] summary", summary);

  return jsonWithRes(res, { ok: true, summary, results }, 200);
}
