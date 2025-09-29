// Deterministic league seeder for tests.
// GET  /api/test/seed-league?leagueId=lg_x&name=My%20League&ownerId=u_owner
// POST /api/test/seed-league  { leagueId, name?, ownerId? }  (JSON or x-www-form-urlencoded)
// Also accepts leagueId/name/ownerId from query even on POST for robustness.

import { NextResponse } from "next/server";
import { getStore, type League } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nowIso() { return new Date().toISOString(); }

type Payload = { leagueId?: string; name?: string; ownerId?: string };

/** Best-effort parse: JSON, urlencoded, and query string (POST or GET) */
async function parsePayload(req: Request): Promise<Payload> {
  const out: Payload = {};
  const url = new URL(req.url);

  // 1) Query string always wins as a fallback
  for (const key of ["leagueId", "name", "ownerId"] as const) {
    const v = url.searchParams.get(key);
    if (v != null) (out as any)[key] = v;
  }

  // 2) Body (if any)
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) {
      const j = await req.json();
      if (j && typeof j === "object") Object.assign(out, j);
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const sp = new URLSearchParams(text);
      for (const key of ["leagueId", "name", "ownerId"] as const) {
        const v = sp.get(key);
        if (v != null) (out as any)[key] = v;
      }
    } else {
      // Try JSON anyway in case the header was missing
      const j = await req.json().catch(() => null);
      if (j && typeof j === "object") Object.assign(out, j);
    }
  } catch {
    // ignore body parse errors; we'll validate below
  }

  // Normalize/trim
  if (out.leagueId) out.leagueId = String(out.leagueId).trim();
  if (out.name) out.name = String(out.name).trim();
  if (out.ownerId) out.ownerId = String(out.ownerId).trim();

  return out;
}

function seedLeagueCore(payload: Payload) {
  const leagueId = String(payload.leagueId ?? "").trim();
  const name = String(payload.name ?? (leagueId ? `League ${leagueId}` : "League unnamed")).trim();
  const ownerId = String(payload.ownerId ?? "u_owner").trim();

  if (!leagueId) {
    return { ok: false as const, status: 400, error: "leagueId is required" };
  }

  const store = getStore();

  if (!store.leagues[leagueId]) {
    const lg: League = {
      id: leagueId,
      name,
      season: undefined,
      ruleset: undefined,
      ownerId,
      ownerEmail: null,
      members: { [ownerId]: "owner" }, // object map (not Set)
      created_at: nowIso(),
    };
    store.leagues[leagueId] = lg;
  } else {
    // Normalize any legacy shapes to the object-map form
    const lg = store.leagues[leagueId] as any;
    if (!(lg.members && typeof lg.members === "object" && !("add" in lg.members))) {
      lg.members = { [ownerId]: "owner" };
    } else {
      lg.members[ownerId] ??= "owner";
    }
    if (!lg.name) lg.name = name;
  }

  return { ok: true as const, status: 200, league: store.leagues[leagueId] };
}

export async function GET(req: Request) {
  const payload = await parsePayload(req);
  const out = seedLeagueCore(payload);
  if (!out.ok) return NextResponse.json({ ok: false, error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, league: out.league }, { status: out.status });
}

export async function POST(req: Request) {
  const payload = await parsePayload(req);
  const out = seedLeagueCore(payload);
  if (!out.ok) return NextResponse.json({ ok: false, error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, league: out.league }, { status: out.status });
}
