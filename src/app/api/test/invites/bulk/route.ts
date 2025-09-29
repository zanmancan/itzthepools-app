// Deterministic bulk invite helper for E2E tests / dev.
// Accepts POST with JSON: { leagueId: string, emails: string | string[] }
// Also supports GET for manual sanity: /api/test/invites/bulk?leagueId=lg_x&emails=a@x.com,b@y.com
//
// It creates non-duplicated invites (by email within the league) in the
// global in-memory TestStore so the UI and other test APIs can read them.

import { NextResponse } from "next/server";
import { getStore, type Invite, type League } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nowIso() { return new Date().toISOString(); }
function rand(n = 8) {
  const al = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += al[(Math.random() * al.length) | 0];
  return s;
}
function token(prefix: string) { return `${prefix}_${rand(10)}`; }

function normalizeEmails(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const text = Array.isArray(raw) ? raw.join("\n") : raw;
  const list = text
    .split(/[\n,;]+/g)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  // Basic email filter
  return Array.from(new Set(list.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))));
}

async function readBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const leagueId = String(body?.leagueId ?? "").trim();
    const emails = normalizeEmails(body?.emails);
    if (!leagueId) return NextResponse.json({ ok:false, error:"leagueId required" }, { status:400 });
    if (!emails.length) return NextResponse.json({ ok:false, error:"no valid emails" }, { status:400 });

    const store = getStore();

    // Ensure league exists (minimal shape)
    if (!store.leagues[leagueId]) {
      const ownerId = "u_owner";
      const lg: League = {
        id: leagueId,
        name: `League ${leagueId}`,
        ownerId,
        ownerEmail: null,
        members: { [ownerId]: "owner" },
        season: undefined,
        ruleset: undefined,
        created_at: nowIso(),
      };
      store.leagues[leagueId] = lg;
    }

    store.invitesByLeague[leagueId] ??= [];
    const existingEmails = new Set(store.invitesByLeague[leagueId].map((i: Invite) => i.email.toLowerCase()));

    const created: Invite[] = [];
    const duplicates: string[] = [];

    for (const email of emails) {
      if (existingEmails.has(email)) {
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
      existingEmails.add(email);
    }

    return NextResponse.json({
      ok: true,
      leagueId,
      counts: { requested: emails.length, created: created.length, duplicates: duplicates.length },
      invites: created.map(i => ({ token: i.token, email: i.email })),
      duplicates,
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error:`bulk failed: ${err?.message || String(err)}` }, { status:500 });
  }
}

export async function GET(req: Request) {
  // Handy manual sanity in the browser
  const url = new URL(req.url);
  const leagueId = (url.searchParams.get("leagueId") || "").trim();
  const emails = normalizeEmails(url.searchParams.get("emails") || "");
  return POST(new Request(req.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ leagueId, emails }),
  }));
}
