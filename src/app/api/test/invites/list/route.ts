import { NextResponse } from "next/server";
import { listAllInvites } from "@/app/api/test/_store";

/**
 * GET /api/test/invites/list
 * Returns all invites in the in-memory store.
 */
export async function GET() {
  try {
    const invites = listAllInvites();
    return NextResponse.json({ ok: true, invites }, { status: 200 });
  } catch (err) {
    console.error("[/api/test/invites/list] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to list test invites" },
      { status: 500 }
    );
  }
}
