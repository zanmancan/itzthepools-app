// src/app/api/invites/context/route.ts
import { NextResponse } from "next/server";
import type { InviteContext } from "@/lib/invites/types";
import { INVITES } from "@/app/api/test/_store";

function isProd() { return process.env.NODE_ENV === "production"; }

export async function GET(req: Request) {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const invite = INVITES.get(token);

  if (!invite) {
    const body: InviteContext = { ok: false, code: "NOT_FOUND", message: "Invite not found" };
    return NextResponse.json(body, { status: 404 });
  }

  // Treat expired/used as immediate error so the page can show a clear state.
  if (invite.consumedAt) {
    const body: InviteContext = { ok: false, code: "USED", message: "Invite token already used" };
    return NextResponse.json(body, { status: 410 });
  }
  if (invite.expiresAt < Date.now()) {
    const body: InviteContext = { ok: false, code: "EXPIRED", message: "Invite token expired" };
    return NextResponse.json(body, { status: 410 });
  }

  const body: InviteContext = {
    ok: true,
    leagueId: invite.leagueId,
    leagueName: invite.leagueName,
    token: invite.token,
    expiresAt: invite.expiresAt,
    consumedAt: invite.consumedAt ?? null,
  };
  return NextResponse.json(body);
}
