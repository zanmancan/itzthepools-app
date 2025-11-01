/**
 * Dev-only seed endpoint.
 * - POST /api/test/seed  → seeds a couple of leagues and invites
 *
 * Safe to call multiple times (idempotent-ish).
 */

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStore, type League } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

const tok = () => `tok_${randomUUID()}`;

export async function POST() {
  const store = getStore();

  // Create two demo leagues if not present
  const ensureLeague = (id: string, name: string, ownerId = "owner_1"): League => {
    const found = store.getLeague(id);
    if (found) return found;
    const lg: League = { id, name, ownerId, members: { [ownerId]: "owner" } };
    store.upsertLeague(lg);
    return lg;
  };

  const a = ensureLeague("lg_alpha", "Alpha League");
  const b = ensureLeague("lg_beta", "Beta League");

  // Add a couple of invites if not present
  const ensureInvite = (leagueId: string, email: string) => {
    const exists = store.INVITES.some(
      (i) => i.leagueId === leagueId && i.email.toLowerCase() === email.toLowerCase()
    );
    if (!exists) {
      store.addInvite({ leagueId, email, role: "member", token: tok() });
    }
  };

  ensureInvite(a.id, "alpha1@example.com");
  ensureInvite(a.id, "alpha2@example.com");
  ensureInvite(b.id, "beta1@example.com");

  return NextResponse.json(
    {
      ok: true,
      seeded: {
        leagues: [a.id, b.id],
        invites: 3,
      },
    },
    { status: 200 }
  );
}
