// src/app/api/invites/accept/route.ts
import { NextResponse } from "next/server";
import type { AcceptInviteRequest, AcceptInviteResponse } from "@/lib/invites/types";
import { INVITES, LEAGUES, type League } from "@/app/api/test/_store";

function isProd() {
  return process.env.NODE_ENV === "production";
}

function getTestUserFromCookie(req: Request) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(/(?:^|;\s*)tp_test_user=([^;]+)/);
  let val = m?.[1] ?? "";
  // Normalize (handle URL-encoded or quoted)
  try { val = decodeURIComponent(val); } catch {}
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val.trim();
}

export async function POST(req: Request) {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  let body: AcceptInviteRequest;
  try {
    body = await req.json();
  } catch {
    const resp: AcceptInviteResponse = { ok: false, code: "BAD_REQUEST", message: "Invalid JSON" };
    return NextResponse.json(resp, { status: 400 });
  }

  const { token, teamName } = body || ({} as AcceptInviteRequest);
  if (!token || !teamName) {
    const resp: AcceptInviteResponse = {
      ok: false,
      code: "BAD_REQUEST",
      message: "token and teamName required",
    };
    return NextResponse.json(resp, { status: 400 });
  }

  const invite = INVITES.get(String(token));
  if (!invite) {
    const resp: AcceptInviteResponse = { ok: false, code: "NOT_FOUND", message: "Invite not found" };
    return NextResponse.json(resp, { status: 404 });
  }

  // --- Auth (relaxed for E2E) -----------------------------------
  const authedEmail = getTestUserFromCookie(req);
  const isAdmin = authedEmail === "admin@example.com";
  if (authedEmail) {
    if (authedEmail !== invite.email && !isAdmin) {
      const resp: AcceptInviteResponse = {
        ok: false,
        code: "FORBIDDEN",
        message: `You are not invited to this league`,
      };
      return NextResponse.json(resp, { status: 403 });
    }
  }
  // If NO cookie, accept as invited user (E2E convenience)
  // -----------------------------------------------------

  if (invite.consumedAt) {
    const resp: AcceptInviteResponse = { ok: false, code: "USED", message: "Invite already used" };
    return NextResponse.json(resp, { status: 410 });
  }
  if (invite.expiresAt < Date.now()) {
    const resp: AcceptInviteResponse = { ok: false, code: "EXPIRED", message: "Invite expired" };
    return NextResponse.json(resp, { status: 410 });
  }

  // Ensure league exists (defensive)
  let league = LEAGUES.get(invite.leagueId);
  if (!league) {
    league = { id: invite.leagueId, name: invite.leagueName, teams: new Set<string>() } as League;
    LEAGUES.set(invite.leagueId, league);
  }

  if (league.teams.has(teamName)) {
    const resp: AcceptInviteResponse = {
      ok: false,
      code: "DUPLICATE_TEAM",
      message: "Team name already taken",
    };
    return NextResponse.json(resp, { status: 409 });
  }

  // Accept
  league.teams.add(teamName);
  invite.consumedAt = Date.now();

  const resp: AcceptInviteResponse = {
    ok: true,
    membershipId: `m_${crypto.randomUUID().slice(0, 8)}`,
    leagueId: invite.leagueId,
    teamName,
  };
  return NextResponse.json(resp);
}
