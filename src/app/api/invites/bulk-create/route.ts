// Bulk create invites for a league (dev/E2E friendly).
// Accepts many client shapes so existing pages/tests keep working.
//
// POST /api/invites/bulk-create
//   Body can be:
//     - JSON: { leagueId, emails: "a@x.com,b@y.com" | string[] | null, text?: string }
//     - form-urlencoded / multipart: leagueId=..., emails=..., text=...
//   (Also tolerates querystring on POST.)
// GET /api/invites/bulk-create?leagueId=...&emails=...
//
// Response mirrors several shapes (invites[], items[], results[]) so legacy
// callers can keep using what they expect without rewrites.

import { NextResponse, NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getStore, type Invite, type League } from "@/app/api/test/_store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ─────────────────────────── Helpers ─────────────────────────── */

function nowIso() {
  return new Date().toISOString();
}

function token() {
  // dev-friendly token; not security sensitive in this stub backend
  return `tok_${randomUUID()}`;
}

/** Accepts string | string[] | undefined and returns unique, trimmed emails */
function normalizeEmails(input: unknown): string[] {
  if (!input) return [];
  let raw: string[] = [];

  if (Array.isArray(input)) {
    raw = input.map(String);
  } else {
    // common textarea → comma/newline/space separated
    const s = String(input);
    raw = s
      .split(/[\n,;]+/g)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  // de-dupe case-insensitively
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of raw) {
    const lc = e.toLowerCase();
    if (!seen.has(lc)) {
      seen.add(lc);
      out.push(e);
    }
  }
  return out;
}

/** Read body from JSON, urlencoded, multipart, plus merge in querystring on POST */
async function parseBody(req: Request): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  const url = new URL(req.url);

  // always pick up query, in case caller sends via GET or mixes with POST
  for (const k of ["leagueId", "emails", "text"] as const) {
    const v = url.searchParams.get(k);
    if (v != null) out[k] = v;
  }

  const ct = (req.headers.get("content-type") || "").toLowerCase();

  try {
    if (ct.includes("application/json")) {
      const j = await req.json();
      if (j && typeof j === "object") Object.assign(out, j as object);
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const t = await req.text();
      const sp = new URLSearchParams(t);
      for (const k of sp.keys()) out[k] = sp.get(k);
    } else if (ct.includes("multipart/form-data")) {
      // In the App Router, Request typically has formData(); add a runtime guard just in case.
      const anyReq = req as unknown as { formData?: () => Promise<FormData> };
      if (typeof anyReq.formData === "function") {
        const form = await anyReq.formData();
        for (const k of form.keys()) out[k] = form.get(k)?.toString();
      }
    } else {
      // Be tolerant: sometimes callers forget headers but still send JSON
      const j = await req.json().catch(() => null);
      if (j && typeof j === "object") Object.assign(out, j as object);
    }
  } catch {
    // ignore malformed bodies; we still may have query params
  }

  // If a free-form textarea was provided, treat it like emails too
  if (out.text && !out.emails) out.emails = out.text;

  return out;
}

/** Ensure a league exists (for dev) or create a friendly stub */
function ensureLeague(store: ReturnType<typeof getStore>, leagueId: string): League {
  const existing = store.LEAGUES.find((l) => l.id === leagueId);
  if (existing) return existing;

  // For local/E2E we’re allowed to create a stub league to keep flows unblocked
  const stub: League = {
    id: leagueId,
    name: `League ${leagueId}`,
    ownerId: "owner_1",
    members: { owner_1: "owner" },
  };
  store.upsertLeague(stub);
  return stub;
}

type BulkCreateResult = {
  ok: true;
  leagueId: string;
  invites: Invite[];               // created
  duplicates: string[];            // skipped (already invited in this league)
  counts: { created: number; duplicates: number; totalRequested: number };
  // compatibility aliases for older call-sites
  items: Invite[];
  results: { email: string; status: "created" | "duplicate" }[];
  createdAt: string;
};

/* ─────────────────────────── Core ─────────────────────────── */

async function bulkCreateCore(leagueId: string, emailsRaw?: unknown): Promise<BulkCreateResult> {
  const store = getStore();
  ensureLeague(store, leagueId);

  // Build a set of "already invited" (case-insensitive) for this league
  const existing = new Set(
    store.INVITES
      .filter((i) => i.leagueId === leagueId)
      .map((i) => i.email.toLowerCase())
  );

  const emails = normalizeEmails(emailsRaw ?? "");
  const created: Invite[] = [];
  const duplicates: string[] = [];

  for (const email of emails) {
    if (existing.has(email.toLowerCase())) {
      duplicates.push(email);
      continue;
    }

    // Use the canonical store helper to keep shapes correct
    const made = store.addInvite({
      leagueId,
      email,
      role: "member",
      token: token(),
    });

    created.push(made);
    existing.add(email.toLowerCase());
  }

  return {
    ok: true,
    leagueId,
    invites: created,
    duplicates,
    items: created,
    results: [
      ...created.map((i) => ({ email: i.email, status: "created" as const })),
      ...duplicates.map((e) => ({ email: e, status: "duplicate" as const })),
    ],
    counts: {
      created: created.length,
      duplicates: duplicates.length,
      totalRequested: emails.length,
    },
    createdAt: nowIso(),
  };
}

/* ─────────────────────────── Routes ─────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req);
    const leagueId = String(body.leagueId || "").trim();
    if (!leagueId) {
      return NextResponse.json(
        { ok: false, error: "leagueId required" },
        { status: 400 }
      );
    }
    const out = await bulkCreateCore(leagueId, body.emails ?? body.text ?? "");
    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `bulk-create POST failed: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const leagueId = (url.searchParams.get("leagueId") || "").trim();
    const emailsRaw = url.searchParams.get("emails") || url.searchParams.get("text") || "";
    if (!leagueId) {
      return NextResponse.json(
        { ok: false, error: "leagueId required" },
        { status: 400 }
      );
    }
    const out = await bulkCreateCore(leagueId, emailsRaw);
    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `bulk-create GET failed: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}
