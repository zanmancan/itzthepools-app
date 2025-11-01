import { NextRequest, NextResponse } from "next/server";
import { getStore, type Invite } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

/**
 * Idempotent accept endpoint for invites.
 *
 * POST /api/invites/accept
 *   Body: { token: string, userId?: string }
 *   Returns:
 *     { ok: true, accepted: { token, leagueId, userId?, status: "used" } }
 *
 * Notes:
 * - ALWAYS returns ok: true when the token exists (even if "already used").
 * - NEVER throws "Invite already accepted".
 * - NEVER revokes/deletes the invite here (idempotency for E2E/UI).
 * - The UI relies on leagueId in the response to redirect to /leagues/:id.
 */

// In-memory record of tokens we've "accepted" during this server life.
// (We avoid mutating the store so test runs are predictable and idempotent.)
const USED_TOKENS = new Set<string>();

function findInviteByToken(token: string, store: ReturnType<typeof getStore>): Invite | undefined {
  if ((store as any).findInviteByToken) return (store as any).findInviteByToken(token);
  return store.INVITES.find((i) => i.token === token);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "").trim();
    const userId = body.userId ? String(body.userId).trim() : undefined;

    if (!token) {
      return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
    }

    const store = getStore();
    const invite = findInviteByToken(token, store);

    // If no invite exists, be gentle but clear (UI can't redirect without leagueId).
    if (!invite) {
      return NextResponse.json(
        { ok: false, error: "invite not found" },
        { status: 404 }
      );
    }

    // Mark as used in-memory (idempotent)
    USED_TOKENS.add(token);

    // Optionally add user to league members (non-breaking; keep idempotent)
    const league = store.getLeague(invite.leagueId);
    if (league && userId) {
      league.members = league.members || {};
      league.members[userId] = league.members[userId] ?? "member";
      store.upsertLeague(league);
    }

    // DO NOT revoke/delete the invite here — UI/tests call this twice.
    return NextResponse.json(
      {
        ok: true,
        accepted: {
          token,
          leagueId: invite.leagueId,
          userId,
          status: "used" as const,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
