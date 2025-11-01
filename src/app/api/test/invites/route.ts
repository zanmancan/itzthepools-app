/* eslint-disable no-console */
/**
 * Dev test helper — stable shapes for tests & UI.
 *
 * POST /api/test/invites
 *   Body: { leagueId, email }
 *   → { ok, invite: { token, status, leagueId, league_id } }
 *
 * GET /api/test/invites                     (NEW) -> { ok, invites:[{ email, leagueId, createdAt, token, status }] }
 * GET /api/test/invites?action=by-token&token=...
 * GET /api/test/invites?action=accept&token=...(&leagueId=...)
 * GET /api/test/invites?action=status&token=...
 * GET /api/test/invites?action=resolve&token=...
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStore, type Invite, type League } from "@/app/api/test/_store";
import devStore from "@/lib/devStore";

export const runtime = "nodejs";

// In-memory trackers (survive within a single dev server lifetime)
const USED_TOKENS = new Set<string>();
const TOKEN_TO_LEAGUE = new Map<string, string>();

const tok = () => randomUUID();

function normalizeEmail(v: unknown): string {
  if (!v) return "";
  const s = Array.isArray(v) ? v[0] : String(v);
  return s.trim();
}
function mirrorLeagueId(leagueId: string) {
  return { leagueId, league_id: leagueId };
}

function findInviteByToken(store: ReturnType<typeof getStore>, token: string): Invite | undefined {
  if ((store as any).findInviteByToken) return (store as any).findInviteByToken(token);
  return store.INVITES.find((i) => i.token === token);
}

/* ────────────────────────────────────────────── POST ─────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const leagueId = String(body.leagueId ?? "").trim();
    const email = normalizeEmail(body.email);

    if (!leagueId) return NextResponse.json({ ok: false, error: "leagueId required" }, { status: 400 });
    if (!email) return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });

    const store = getStore();

    // Ensure league exists (legacy store)
    let lg: League | undefined = store.getLeague(leagueId);
    if (!lg) {
      lg = { id: leagueId, name: `League ${leagueId}`, ownerId: "owner_1", members: { owner_1: "owner" } };
      store.upsertLeague(lg);
    }

    // Reuse invite for same league/email (legacy store)
    let invite =
      store.INVITES.find((i) => i.leagueId === leagueId && i.email.toLowerCase() === email.toLowerCase());
    if (!invite) {
      invite = store.addInvite({ leagueId, email, role: "member", token: tok() });
    }

    // Mirror to the unified devStore so dashboard panel sees the same data
    devStore.upsertLeague({ id: leagueId, name: `League ${leagueId}` });
    devStore.upsertInvite({
      leagueId,
      email,
      token: invite.token,
      createdAt: new Date().toISOString(),
      status: "Active",
    });

    TOKEN_TO_LEAGUE.set(invite.token, invite.leagueId);
    const used = USED_TOKENS.has(invite.token);

    return NextResponse.json(
      {
        ok: true,
        invite: { token: invite.token, status: used ? "used" : "pending", ...mirrorLeagueId(invite.leagueId) },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[test/invites POST] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

/* ─────────────────────────────────────────────── GET ─────────────────────────────────────────── */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = (url.searchParams.get("action") || "").toLowerCase();

    // NEW: default list for the dashboard panel (no action param)
    if (!action) {
      const list = devStore.listInvites({ includeRevoked: false });
      // shape used by the panel: { email, leagueId, createdAt, status, token }
      return NextResponse.json({ ok: true, invites: list }, { status: 200 });
    }

    const token = String(url.searchParams.get("token") ?? "").trim();
    const store = getStore();

    if (action === "by-token") {
      if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
      let inv = findInviteByToken(store, token);
      const leagueId = inv?.leagueId ?? TOKEN_TO_LEAGUE.get(token);
      if (!inv && leagueId) {
        inv = { token, leagueId, email: "", role: "member", id: `synthetic_${token}` } as Invite;
      }
      if (!inv) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

      TOKEN_TO_LEAGUE.set(token, inv.leagueId);
      const used = USED_TOKENS.has(token);

      return NextResponse.json(
        {
          ok: true,
          invite: { token: inv.token, status: used ? "used" : "pending", ...mirrorLeagueId(inv.leagueId) },
        },
        { status: 200 }
      );
    }

    if (action === "accept") {
      if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });

      if (USED_TOKENS.has(token)) {
        return NextResponse.json({ ok: false, error: "Invite already accepted" }, { status: 200 });
      }
      USED_TOKENS.add(token);

      const paramLeagueId = (url.searchParams.get("leagueId") ?? "").trim();
      const inv = findInviteByToken(store, token);
      const leagueId = paramLeagueId || inv?.leagueId || TOKEN_TO_LEAGUE.get(token) || "";

      if (leagueId) TOKEN_TO_LEAGUE.set(token, leagueId);

      return NextResponse.json(
        {
          ok: true,
          accepted: { token, status: "used" as const, ...mirrorLeagueId(leagueId) },
        },
        { status: 200 }
      );
    }

    if (action === "status") {
      if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
      const used = USED_TOKENS.has(token);
      return NextResponse.json({ ok: true, status: used ? "used" : "pending" }, { status: 200 });
    }

    if (action === "resolve") {
      if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
      const inv = findInviteByToken(store, token);
      const leagueId = inv?.leagueId ?? TOKEN_TO_LEAGUE.get(token) ?? "";
      return NextResponse.json({ ok: true, leagueId }, { status: 200 });
    }

    return NextResponse.json({ ok: false, error: `unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("[test/invites GET] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
