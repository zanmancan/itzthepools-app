// Seed helper for E2E tests.
// GET /api/test/seed?leagueId=lg_flow&email=user@example.com[&used=1]
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const leagueId = (url.searchParams.get("leagueId") || "lg_flow").trim();
    const email = (url.searchParams.get("email") || "user@example.com").trim();
    const markUsed = url.searchParams.get("used") === "1";
    if (!leagueId) return NextResponse.json({ ok:false, error:"leagueId is required" }, { status:400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok:false, error:"valid email required" }, { status:400 });

    const store = getStore();

    // Ensure league exists
    if (!store.leagues[leagueId]) {
      const ownerId = "u_owner";
      const lg: League = {
        id: leagueId,
        name: `League ${leagueId}`,
        season: undefined,
        ruleset: undefined,
        ownerId,
        ownerEmail: null,
        members: { [ownerId]: "owner" },
        created_at: nowIso(),
      };
      store.leagues[leagueId] = lg;
    }

    // Make invite
    const inv: Invite = {
      id: `inv_${rand(8)}`,
      token: token("tk"),
      email,
      is_public: false,
      expires_at: null,
      used_at: markUsed ? nowIso() : null,
      created_at: nowIso(),
      league_id: leagueId,
    };

    // Index everywhere
    store.invitesByToken[inv.token] = inv;
    (store.invitesByLeague[leagueId] ??= []).push(inv);

    const res = NextResponse.json({ ok: true, leagueId, token: inv.token, invite: inv }, { status: 200 });
    res.cookies.set("tp_last_invite", JSON.stringify({ leagueId, token: inv.token, email }), {
      path: "/", httpOnly: false, sameSite: "lax", maxAge: 600,
    });

    const ck = cookies();
    if (!ck.get("tp_test_user")) {
      res.cookies.set("tp_test_user", "u_test", { path:"/", httpOnly:false, sameSite:"lax", maxAge:3600 });
    }
    return res;
  } catch (err: any) {
    return NextResponse.json({ ok:false, error:`seed failed: ${err?.message || String(err)}` }, { status:500 });
  }
}
