import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStore, type Invite, type League } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime  = "nodejs" as const;

const tok = () => `tok_${randomUUID()}`;

function normalize(input: unknown): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input.map(String) : String(input).split(/[\n,;]+/g);
  const seen = new Set<string>(); const out: string[] = [];
  for (const e of arr.map(v => v.trim()).filter(Boolean)) {
    const k = e.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(e); }
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const leagueId = String(body.leagueId ?? "").trim();
    const emails = normalize(body.emails ?? body.text ?? "");

    if (!leagueId) return NextResponse.json({ ok: false, error: "leagueId required" }, { status: 400 });

    const store = getStore();
    let lg = store.getLeague(leagueId);
    if (!lg) {
      const stub: League = { id: leagueId, name: `League ${leagueId}`, ownerId: "owner_1", members: { owner_1: "owner" } };
      store.upsertLeague(stub);
      lg = stub;
    }

    const existing = new Set(store.INVITES.filter(i => i.leagueId === leagueId).map(i => i.email.toLowerCase()));
    const created: Invite[] = []; const duplicates: string[] = [];

    for (const email of emails) {
      if (existing.has(email.toLowerCase())) { duplicates.push(email); continue; }
      const inv = store.addInvite({ leagueId, email, role: "member", token: tok() });
      created.push(inv); existing.add(email.toLowerCase());
    }

    return NextResponse.json({
      ok: true, leagueId,
      invites: created, items: created,
      duplicates, counts: { created: created.length, duplicates: duplicates.length, totalRequested: emails.length },
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
