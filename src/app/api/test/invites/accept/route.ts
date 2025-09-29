import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nowIso() { return new Date().toISOString(); }

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = (url.searchParams.get("token") || "").trim();
    if (!token) return NextResponse.json({ ok:false, error:"token required" }, { status:400 });

    const store = getStore();
    const inv = store.invitesByToken[token];
    if (!inv) return NextResponse.json({ ok:false, error:"Invite not found" }, { status:200 });

    // idempotent mark-used
    if (!inv.used_at) inv.used_at = nowIso();

    // ensure league exists
    const leagueId = inv.league_id;
    if (!store.leagues[leagueId]) {
      store.leagues[leagueId] = {
        id: leagueId,
        name: `League ${leagueId}`,
        ownerId: "u_owner",
        ownerEmail: null,
        members: { u_owner: "owner" },
        created_at: nowIso(),
      };
    }

    // add current test user as member
    const ck = cookies();
    const userId = ck.get("tp_test_user")?.value || "u_test";
    store.leagues[leagueId].members ??= {};
    store.leagues[leagueId].members[userId] = "member";

    // keep list index consistent if present
    const list = (store.invitesByLeague[leagueId] ??= []);
    for (const it of list) if (it.token === token) it.used_at = inv.used_at;

    return NextResponse.json({ ok: true, invite: { token, used: true }, leagueId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error:`accept failed: ${err?.message || String(err)}` }, { status:500 });
  }
}
