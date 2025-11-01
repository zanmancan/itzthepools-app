import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime  = "nodejs" as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "").trim();
    const userId = String(body.userId ?? "u_test").trim();

    if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });

    const store = getStore();
    const inv = store.findInviteByToken(token);
    if (!inv) return NextResponse.json({ ok: false, error: "invite not found" }, { status: 404 });

    const lg = store.getLeague(inv.leagueId);
    if (!lg) return NextResponse.json({ ok: false, error: "league missing" }, { status: 404 });

    lg.members = lg.members || {};
    lg.members[userId] = "member";
    store.upsertLeague(lg);

    store.revokeInvite(inv.id);

    return NextResponse.json({ ok: true, accepted: { token, leagueId: inv.leagueId, userId } }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
