import { NextResponse } from "next/server";
import { listInvitesForOwner } from "@/app/api/test/_store";

/**
 * GET /api/test/invites/mine?ownerId=owner_1
 * Owner-scoped view of invites (by leagues they own).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("ownerId");
    if (!ownerId) {
      return NextResponse.json(
        { ok: false, error: "Missing ownerId" },
        { status: 400 }
      );
    }
    const invites = listInvitesForOwner(ownerId);
    return NextResponse.json({ ok: true, invites }, { status: 200 });
  } catch (err) {
    console.error("[/api/test/invites/mine] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to list owner invites" },
      { status: 500 }
    );
  }
}
