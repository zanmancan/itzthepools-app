import { NextRequest, NextResponse } from "next/server";
import devStore from "@/lib/devStore";

export async function POST(req: NextRequest) {
  try {
    const { leagueId, email, token } = await req.json();
    if (!leagueId) {
      return NextResponse.json({ ok: false, error: "leagueId is required" }, { status: 400 });
    }
    const removed = devStore.revokeInvite({ leagueId, email, token });
    return NextResponse.json({ ok: true, removed });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
