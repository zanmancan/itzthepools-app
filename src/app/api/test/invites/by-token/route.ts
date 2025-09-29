import { NextResponse } from "next/server";
import { getStore } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = (url.searchParams.get("token") || "").trim();
    if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });

    const store = getStore();
    const inv = store.invitesByToken[token];
    if (!inv) return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 200 });

    return NextResponse.json({
      ok: true,
      invite: {
        id: inv.id,
        token: inv.token,
        email: inv.email,
        league_id: inv.league_id,
        used: !!inv.used_at,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
      },
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: `by-token failed: ${err?.message || String(err)}` }, { status: 500 });
  }
}
