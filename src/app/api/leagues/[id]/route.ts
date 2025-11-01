/**
 * REST item for a single league.
 * - GET    /api/leagues/:id         → fetch league
 * - PATCH  /api/leagues/:id         → update basic fields (e.g., name)
 * - DELETE /api/leagues/:id         → soft-delete league (dev)
 */

import { NextRequest, NextResponse } from "next/server";
import { getStore, type League } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

/** GET: fetch one league by id */
export async function GET(_: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const store = getStore();
  const league = store.getLeague(id);
  if (!league) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, league }, { status: 200 });
}

/** PATCH: update limited fields (currently `name`) */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { id } = ctx.params;
    const body = await req.json().catch(() => ({}));
    const store = getStore();
    const league = store.getLeague(id);

    if (!league) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

    const updated: League = {
      ...league,
      name: body.name ? String(body.name).trim() : league.name,
    };

    store.upsertLeague(updated);
    return NextResponse.json({ ok: true, league: updated }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

/**
 * DELETE: soft-delete league (dev)
 * Our store has no `deleteLeague`, so we "tombstone" it by renaming and
 * leaving members intact (keeps tests stable; no hard deletes).
 */
export async function DELETE(_: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const store = getStore();
  const league = store.getLeague(id);
  if (!league) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const tombstoned: League = {
    ...league,
    name: league.name.endsWith(" (removed)") ? league.name : `${league.name} (removed)`,
  };

  store.upsertLeague(tombstoned);

  // Optionally: you can also revoke outstanding invites for this league.
  // (We avoid mutating arrays directly to keep store typing happy.)
  // for (const inv of store.INVITES.filter(i => i.leagueId === id)) {
  //   store.revokeInvite(inv.id);
  // }

  return NextResponse.json({ ok: true, removed: id, softDeleted: true }, { status: 200 });
}
