// src/app/api/test/invites/mine/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listInvitesForOwner } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProd() {
  return process.env.NODE_ENV === "production";
}
function viewer(): string {
  const raw = cookies().get("tp_test_user")?.value ?? "";
  try { return decodeURIComponent(raw); } catch { return raw; }
}

/**
 * GET /api/test/invites/mine
 * Returns invites for leagues owned by current test user (tp_test_user)
 * { invites: Array<{token,email,leagueId,leagueName,expiresAt,consumedAt}> }
 */
export async function GET() {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });
  const me = viewer();
  if (!me) return NextResponse.json({ invites: [] });
  const invites = listInvitesForOwner(me);
  return NextResponse.json({ invites });
}
