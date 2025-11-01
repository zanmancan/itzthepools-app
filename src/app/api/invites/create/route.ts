import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStore, type League, type Invite } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

/** Generate a readable token */
const tok = () => `tok_${randomUUID()}`;

/** Ensure a league exists in the dev store (used by tests) */
function ensureLeague(store: ReturnType<typeof getStore>, id: string): League {
  const found = store.LEAGUES.find((l) => l.id === id);
  if (found) return found;
  const stub: League = {
    id,
    name: `League ${id}`,
    ownerId: "owner_1",
    members: { owner_1: "owner" },
    sport: "nfl",
    season: "2025",
  } as any;
  store.LEAGUES.push(stub);
  return stub;
}

/** Split on whitespace, commas, semicolons; trim + dedupe */
function normalizeEmails(input: unknown): string[] {
  if (!input) return [];
  const raw = Array.isArray(input)
    ? input.flatMap((v) => String(v).split(/[\s,;]+/g))
    : String(input).split(/[\s,;]+/g);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of raw.map((s) => s.trim()).filter(Boolean)) {
    const lower = e.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      out.push(e);
    }
  }
  return out;
}

/** Minimal email check for dev routes */
function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";

    // ---- Parse inputs from JSON, forms, or querystring (compat) ----
    let leagueId = "";
    let emailSingle = "";
    let emailsRaw: unknown = null;

    if (ct.includes("application/json")) {
      const body = (await req.json().catch(() => ({}))) as any;
      leagueId = String(body.leagueId ?? body.league_id ?? "").trim();
      emailSingle = String(body.email ?? "").trim();
      emailsRaw = body.emails ?? body.text ?? null;
    } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData();
      leagueId = String(form.get("leagueId") ?? form.get("league_id") ?? "").trim();
      emailSingle = String(form.get("email") ?? "").trim();
      emailsRaw = form.get("emails") ?? form.get("text") ?? null;
    }

    // Always also honor query params (legacy callers)
    const url = new URL(req.url);
    leagueId = leagueId || String(url.searchParams.get("leagueId") ?? url.searchParams.get("league_id") ?? "").trim();
    emailSingle = emailSingle || String(url.searchParams.get("email") ?? "").trim();
    emailsRaw = emailsRaw ?? url.searchParams.get("emails") ?? url.searchParams.get("text");

    if (!leagueId) {
      return NextResponse.json({ ok: false, error: "leagueId required" }, { status: 400 });
    }

    // Accept either `email` OR `emails`
    const emails = normalizeEmails(emailsRaw ?? emailSingle);
    if (emails.length === 0) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }

    const store = getStore();
    const league = ensureLeague(store, leagueId);

    const created: Invite[] = [];
    const nowIso = new Date().toISOString();

    for (const email of emails) {
      if (!isEmail(email)) continue; // skip bad entries silently (client already validates)
      const invite: Invite = {
        id: `inv_${randomUUID()}`,
        leagueId: league.id,
        email,
        role: "member",
        token: tok(),
        status: "pending",
        createdAt: nowIso,
      } as any;

      // snake_case mirrors (older code/tests read these)
      (invite as any).league_id = invite.leagueId;
      (invite as any).created_at = invite.createdAt;

      store.INVITES.push(invite);
      created.push(invite);
    }

    if (created.length === 0) {
      return NextResponse.json({ ok: false, error: "no valid emails" }, { status: 400 });
    }

    // Compatibility: keep `invite` (first), plus array shapes most callers understand
    return NextResponse.json(
      { ok: true, invite: created[0], invites: created, items: created, count: created.length },
      { status: 200 }
    );
  } catch (err: any) {
    // Make failures obvious in Playwright traces
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
