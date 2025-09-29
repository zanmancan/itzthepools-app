// Lists invites for a league (used by the Bulk Invites page after POST).
// GET /api/leagues/:id/invites
//
// Returns shapes that most UIs use: items[], invites[] (dup), count.

import { NextResponse } from "next/server";
import { getStore, type Invite } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const leagueId = String(ctx.params.id || "").trim();
    if (!leagueId) {
      return NextResponse.json({ ok: false, error: "league id required" }, { status: 400 });
    }

    const store = getStore();
    const list: Invite[] = store.invitesByLeague[leagueId] ?? [];

    // Normalize to a simple, email-forwarding shape.
    const items = list.map(inv => ({
      id: inv.id,
      email: inv.email,
      token: inv.token,
      used: !!inv.used_at,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
    }));

    return NextResponse.json(
      {
        ok: true,
        leagueId,
        count: items.length,
        items,           // <- primary key most pages iterate over
        invites: items,  // <- alias for older components
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `invites list failed: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}
