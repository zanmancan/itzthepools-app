// src/app/api/invites/accept/route.ts
import { NextResponse } from "next/server";
import { INVITES, LEAGUES } from "@/app/api/test/_store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTestUserFromCookie(req: Request) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(/(?:^|;\s*)tp_test_user=([^;]+)/);
  let val = m?.[1] ?? "";
  try { val = decodeURIComponent(val); } catch {}
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val.trim();
}

function normalizeTeamName(n?: unknown) {
  const v = String(n ?? "").trim();
  if (!v) return { ok: false as const, reason: "Team name required." };
  if (v.length < 2) return { ok: false as const, reason: "Team name must be at least 2 characters." };
  if (v.length > 30) return { ok: false as const, reason: "Team name must be 30 characters or fewer." };
  if (!/^[A-Za-z0-9 _-]+$/.test(v)) return { ok: false as const, reason: "Only letters, numbers, spaces, dashes and underscores are allowed." };
  return { ok: true as const, value: v };
}

export async function POST(req: Request) {
  const email = getTestUserFromCookie(req);
  const { token, teamName } = await req.json().catch(() => ({} as any));

  const invite = INVITES.get(String(token || ""));
  if (!invite) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Invite not found" },
      { status: 404 }
    );
  }

  // Invite must belong to this user
  if (invite.email !== email) {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Invite does not belong to this user" },
      { status: 403 }
    );
  }

  // Expired / used checks
  if (invite.expiresAt <= Date.now()) {
    return NextResponse.json(
      { ok: false, code: "EXPIRED", message: "Invite token expired" },
      { status: 410 }
    );
  }
  if (invite.consumedAt) {
    return NextResponse.json(
      { ok: false, code: "USED", message: "Invite already used" },
      { status: 409 }
    );
  }

  // Team validation + uniqueness
  const team = normalizeTeamName(teamName);
  if (!team.ok) {
    return NextResponse.json(
      { ok: false, code: "BAD_TEAM", message: team.reason },
      { status: 400 }
    );
  }

  const league = LEAGUES.get(invite.leagueId);
  if (!league) {
    return NextResponse.json(
      { ok: false, code: "LEAGUE_NOT_FOUND", message: "League missing" },
      { status: 500 }
    );
  }

  if (league.teams.has(team.value)) {
    return NextResponse.json(
      { ok: false, code: "TEAM_EXISTS", message: "Team name already taken" },
      { status: 409 }
    );
  }

  // Accept
  league.teams.add(team.value);
  invite.consumedAt = Date.now();

  return NextResponse.json({
    ok: true,
    membershipId: `m_${crypto.randomUUID().slice(0, 8)}`,
    leagueId: invite.leagueId,
    teamName: team.value,
  });
}
