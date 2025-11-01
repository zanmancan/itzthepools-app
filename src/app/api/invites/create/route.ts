import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStore, type League, type Invite } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

const tok = () => `tok_${randomUUID()}`;

function ensureLeague(store: ReturnType<typeof getStore>, id: string): League {
  const found = store.LEAGUES.find((l) => l.id === id);
  if (found) return found;
  const stub: League = {
    id,
    name: `League ${id}`,
    ownerId: "owner_1",
    members: { owner_1: "owner" },
  };
  store.upsertLeague(stub);
  return stub;
}

/**
 * Create a single invite for a league.
 * Body JSON: { leagueId: string, email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const leagueId = String(body.leagueId ?? "").trim();
    const email = String(body.email ?? "").trim();

    if (!leagueId) {
      return NextResponse.json({ ok: false, error: "leagueId required" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }

    const store = getStore();
    ensureLeague(store, leagueId);

    // prevent duplicate invites by league/email (case-insensitive)
    const exists = store.INVITES.some(
      (i) => i.leagueId === leagueId && i.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      return NextResponse.json(
        { ok: true, duplicate: true, invite: null as Invite | null },
        { status: 200 }
      );
    }

    const invite = store.addInvite({
      leagueId,
      email,
      role: "member",
      token: tok(),
    });

    return NextResponse.json({ ok: true, invite }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
