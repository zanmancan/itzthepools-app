import { NextResponse } from "next/server";
import { removeInviteById } from "@/app/api/test/_store";

/**
 * POST /api/test/invites/revoke
 * Body: { id: string }
 * Fully removes the invite (different from /api/invites/revoke which marks revoked).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    if (!body?.id) {
      return NextResponse.json(
        { ok: false, error: "Missing 'id' in request body" },
        { status: 400 }
      );
    }
    const ok = removeInviteById(body.id);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Invite not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[/api/test/invites/revoke] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to remove invite" },
      { status: 500 }
    );
  }
}
