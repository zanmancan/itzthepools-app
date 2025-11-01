import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStore, type Invite, type League } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

const nowIso = () => new Date().toISOString();
const tok = () => `tok_${randomUUID()}`;

function normalizeEmails(input: unknown): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input.map(String) : String(input).split(/[\n,;]+/g);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of arr.map((v) => v.trim()).filter(Boolean)) {
    const k = e.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(e);
    }
  }
  return out;
}

async function readBody(req: Request): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  const url = new URL(req.url);
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  for (const k of ["leagueId", "emails", "text"] as const) {
    const v = url.searchParams.get(k);
    if (v != null) out[k] = v;
  }

  try {
    if (ct.includes("application/json")) {
      Object.assign(out, (await req.json()) as object);
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const sp = new URLSearchParams(await req.text());
      for (const k of sp.keys()) out[k] = sp.get(k);
    } else if (ct.includes("multipart/form-data")) {
      const anyReq = req as unknown as { formData?: () => Promise<FormData> };
      if (typeof anyReq.formData === "function") {
        const f = await anyReq.formData();
        for (const k of f.keys()) out[k] = f.get(k)?.toString();
      }
    } else {
      const j = await req.json().catch(() => null);
      if (j && typeof j === "object") Object.assign(out, j as object);
    }
  } catch {
    /* ignore */
  }

  if (out.text && !out.emails) out.emails = out.text;
  return out;
}

function ensureLeague(store: ReturnType<typeof getStore>, id: string): League {
  const found = store.LEAGUES.find((l) => l.id === id);
  if (found) return found;
  const stub: League = { id, name: `League ${id}`, ownerId: "owner_1", members: { owner_1: "owner" } };
  store.upsertLeague(stub);
  return stub;
}

type BulkOut = {
  ok: true;
  leagueId: string;
  invites: Invite[];
  duplicates: string[];
  counts: { created: number; duplicates: number; totalRequested: number };
  items: Invite[];
  results: { email: string; status: "created" | "duplicate" }[];
  createdAt: string;
};

async function core(leagueId: string, emailsRaw: unknown): Promise<BulkOut> {
  const store = getStore();
  ensureLeague(store, leagueId);

  const existing = new Set(
    store.INVITES.filter((i) => i.leagueId === leagueId).map((i) => i.email.toLowerCase())
  );

  const emails = normalizeEmails(emailsRaw ?? "");
  const created: Invite[] = [];
  const duplicates: string[] = [];

  for (const email of emails) {
    if (existing.has(email.toLowerCase())) {
      duplicates.push(email);
      continue;
    }
    const inv = store.addInvite({ leagueId, email, role: "member", token: tok() });
    created.push(inv);
    existing.add(email.toLowerCase());
  }

  return {
    ok: true,
    leagueId,
    invites: created,
    duplicates,
    items: created, // alias for legacy consumers
    results: [
      ...created.map((i) => ({ email: i.email, status: "created" as const })),
      ...duplicates.map((e) => ({ email: e, status: "duplicate" as const })),
    ],
    counts: { created: created.length, duplicates: duplicates.length, totalRequested: emails.length },
    createdAt: nowIso(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);
    const leagueId = String(body.leagueId ?? "").trim();
    if (!leagueId) {
      return NextResponse.json({ ok: false, error: "leagueId required" }, { status: 400 });
    }
    const out = await core(leagueId, body.emails ?? body.text ?? "");
    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `bulk POST failed: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const leagueId = String(url.searchParams.get("leagueId") ?? "").trim();
    const emailsRaw = url.searchParams.get("emails") || url.searchParams.get("text") || "";
    if (!leagueId) {
      return NextResponse.json({ ok: false, error: "leagueId required" }, { status: 400 });
    }
    const out = await core(leagueId, emailsRaw);
    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `bulk GET failed: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}
