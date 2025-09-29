import { NextResponse } from "next/server";
import { revokeInvite } from "@/app/api/test/_store";

/**
 * POST /api/invites/revoke
 * Body: { id: string }
 * Marks an invite as revoked (does NOT delete).
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
    const inv = revokeInvite(body.id);
    if (!inv) {
      return NextResponse.json(
        { ok: false, error: "Invite not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, invite: inv }, { status: 200 });
  } catch (err) {
    console.error("[/api/invites/revoke] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to revoke invite" },
      { status: 500 }
    );
  }
}
