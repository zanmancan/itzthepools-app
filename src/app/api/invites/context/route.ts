// src/app/api/invites/context/route.ts
import { NextResponse } from "next/server";
import { INVITES } from "@/app/api/test/_store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns context for an invite token.
 * Error cases:
 *   - NOT_FOUND (404)
 *   - EXPIRED (410)
 *   - USED (409)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const invite = INVITES.get(token);

  if (!invite) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Invite not found" },
      { status: 404 }
    );
  }

  if (invite.expiresAt <= Date.now()) {
    return NextResponse.json(
      { ok: false, code: "EXPIRED", message: "Invite token expired" },
      { status: 410 }
    );
  }

  if (invite.consumedAt) {
    return NextResponse.json(
      { ok: false, code: "USED", message: "Invite link has already been used" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    leagueId: invite.leagueId,
    leagueName: invite.leagueName,
    token: invite.token,
    expiresAt: invite.expiresAt,
    consumedAt: invite.consumedAt ?? null,
  });
}
