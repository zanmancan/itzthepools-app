import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { persistGetLeaguesFor } from "@/app/api/test/_persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Use the same uid behavior as the rest of test routes
  const uid = cookies().get("tp_test_user")?.value || "u_test";
  const list = persistGetLeaguesFor(uid);
  if (!list.length) {
    return NextResponse.json({ ok: false, error: "none" }, { status: 404 });
  }
  // Most recent is first in persistGetLeaguesFor
  return NextResponse.json({ ok: true, league: list[0] });
}
