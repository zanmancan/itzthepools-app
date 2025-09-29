import { NextResponse } from "next/server";
import {
  acceptInviteByToken,
  findInviteById,
  revokeInvite,
  getLeague,
  LEAGUES,
  INVITES,
} from "@/app/api/test/_store";

/**
 * POST /api/invites/accept
 * Body: { token?: string; id?: string; joinKey?: string }
 * - Accepts by token (preferred) or by id (fallback).
 * - Updates in-memory store only (local/dev).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      id?: string;
      joinKey?: string;
    };

    if (!body?.token && !body?.id) {
      return NextResponse.json(
        { ok: false, error: "Provide 'token' or 'id' to accept invite" },
        { status: 400 }
      );
    }

    if (body.token) {
      const { invite, league } = acceptInviteByToken(body.token, body.joinKey);
      return NextResponse.json({ ok: true, invite, league }, { status: 200 });
    }

    // Fallback path: accept by id (treated same as token accept)
    const inv = findInviteById(body.id!);
    if (!inv) {
      return NextResponse.json(
        { ok: false, error: "Invite not found for id" },
        { status: 404 }
      );
    }
    const { invite, league } = acceptInviteByToken(inv.token, body.joinKey);
    return NextResponse.json({ ok: true, invite, league }, { status: 200 });
  } catch (err: any) {
    const status = Number(err?.status) || 500;
    const message = err?.message || "Failed to accept invite";
    console.error("[/api/invites/accept] error:", err);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

// Optional visibility endpoint for quick debugging of the stub store.
// Keep these exports to satisfy earlier imports you had in this file.
export { LEAGUES, INVITES };
