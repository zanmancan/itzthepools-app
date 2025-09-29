// Bulk create invites for a league (dev/E2E friendly).
// Accepts many client shapes so the page works without changes.
//
// POST /api/invites/bulk-create
// Body can be:
//   - JSON: { leagueId, emails: "a@x.com,b@y.com" | string[] | null, text?: string }
//   - form-urlencoded / multipart: leagueId=..., emails=..., text=...
// Query string (?leagueId=...&emails=...) is also accepted on POST and GET.
//
// Response includes multiple shapes (invites[], items[], results[]) so
// existing UIs/tests can pick whichever they expect.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore, type Invite, type League } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -------------- utils --------------
const nowIso = () => new Date().toISOString();
const rand = (n = 10) => {
  const al = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += al[(Math.random() * al.length) | 0];
  return s;
};
const token = (p = "tk") => `${p}_${rand(10)}`;
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function normalizeEmails(raw?: unknown): string[] {
  if (!raw) return [];
  let text = "";
  if (Array.isArray(raw)) text = raw.join("\n");
  else text = String(raw);
  const list = text.split(/[\n,; ]+/g).map(s => s.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(list.filter(isEmail)));
}

async function parseBody(req: Request): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  const url = new URL(req.url);

  // query always available
  for (const k of ["leagueId", "emails", "text"]) {
    const v = url.searchParams.get(k);
    if (v != null) out[k] = v;
  }

  const ct = (req.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) {
      const j = await req.json();
      if (j && typeof j === "object") Object.assign(out, j);
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const t = await req.text();
      const sp = new URLSearchParams(t);
      for (const k of sp.keys()) out[k] = sp.get(k);
    } else if (ct.includes("multipart/form-data")) {
      const form = await (req as any).formData?.();
      if (form) for (const k of form.keys()) out[k] = form.get(k)?.toString();
    } else {
      // try json anyway if header missing
      const j = await req.json().catch(() => null);
      if (j && typeof j === "object") Object.assign(out, j);
    }
  } catch {
    // ignore
  }
  return out;
}

function viewerId(): string {
  const ck = cookies();
  return ck.get("tp_test_user")?.value || ck.get("tp_user")?.value || "u_test";
}

function ensureLeague(store: any, leagueId: string): League {
  if (!store.leagues[leagueId]) {
    const ownerId = "u_owner";
    const lg: League = {
      id: leagueId,
      name: `League ${leagueId}`,
      season: undefined,
      ruleset: undefined,
      ownerId,
      ownerEmail: null,
      members: { [ownerId]: "owner" },
      created_at: nowIso(),
    };
    store.leagues[leagueId] = lg;
  }
  return store.leagues[leagueId];
}

function isOwnerOrAdmin(store: any, leagueId: string, userId: string): boolean {
  const lg: League | undefined = store.leagues[leagueId];
  if (!lg) return false;
  const role = lg.members?.[userId];
  return role === "owner" || role === "admin";
}

async function bulkCreateCore(leagueId: string, emailsRaw?: unknown) {
  const store = getStore();
  ensureLeague(store, leagueId);

  store.invitesByLeague[leagueId] ??= [];
  const existing = new Set(store.invitesByLeague[leagueId].map((i: Invite) => i.email.toLowerCase()));

  // Accept "emails" (string | string[]) or "text" (string)
  const emails = normalizeEmails((emailsRaw ?? "") as any);

  const created: Invite[] = [];
  const duplicates: string[] = [];

  for (const email of emails) {
    if (existing.has(email)) {
      duplicates.push(email);
      continue;
    }
    const inv: Invite = {
      id: `inv_${rand(8)}`,
      token: token("tk"),
      email,
      is_public: false,
      expires_at: null,
      used_at: null,
      created_at: nowIso(),
      league_id: leagueId,
    };
    store.invitesByToken[inv.token] = inv;
    store.invitesByLeague[leagueId].push(inv);
    created.push(inv);
    existing.add(email);
  }

  // Provide multiple keys so any component shape works
  return {
    ok: true as const,
    leagueId,
    counts: { requested: emails.length, created: created.length, duplicates: duplicates.length },
    invites: created.map(i => ({ token: i.token, email: i.email })),   // common
    items: created.map(i => ({ email: i.email, token: i.token })),     // alt
    results: created.map(i => ({ email: i.email, status: "created" })),// alt
    duplicates,
  };
}

// -------------- handlers --------------
export async function POST(req: Request) {
  try {
    const body = await parseBody(req);
    const leagueId = String(body?.leagueId ?? "").trim();
    const emailsRaw = body?.emails ?? body?.text;

    if (!leagueId) return NextResponse.json({ ok: false, error: "leagueId required" }, { status: 400 });

    const store = getStore();
    ensureLeague(store, leagueId);
    const dev = process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1";
    const user = viewerId();
    if (!dev && !isOwnerOrAdmin(store, leagueId, user)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const out = await bulkCreateCore(leagueId, emailsRaw);
    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: `bulk-create failed: ${err?.message || String(err)}` }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const leagueId = (url.searchParams.get("leagueId") || "").trim();
    const emailsRaw = url.searchParams.get("emails") || "";
    if (!leagueId) return NextResponse.json({ ok: false, error: "leagueId required" }, { status: 400 });
    const out = await bulkCreateCore(leagueId, emailsRaw);
    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: `bulk-create GET failed: ${err?.message || String(err)}` }, { status: 500 });
  }
}
