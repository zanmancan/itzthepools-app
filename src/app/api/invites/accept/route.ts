import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

/**
 * Accept an invite by token and add the user to the league's members.
 * Body JSON: { token: string, userId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "").trim();
    const userId = String(body.userId ?? "u_test").trim();

    if (!token) {
      return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
    }

    const store = getStore();
    const invite = store.findInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ ok: false, error: "invite not found" }, { status: 404 });
    }

    const league = store.getLeague(invite.leagueId);
    if (!league) {
      return NextResponse.json({ ok: false, error: "league missing" }, { status: 404 });
    }

    // add member
    league.members = league.members || {};
    league.members[userId] = "member";
    store.upsertLeague(league);

    // revoke invite after acceptance
    store.revokeInvite(invite.id);

    return NextResponse.json(
      { ok: true, accepted: { token, leagueId: invite.leagueId, userId } },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/**
 * IMPORTANT:
 * Do NOT export anything else from this module (no store objects, helpers, etc.).
 * Next.js validates API route exports and will fail the build if extra symbols leak.
 */
