// src/app/api/test/invites/revoke/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLeague, revokeInvite, INVITES } from "@/app/api/test/_store";

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
 * POST /api/test/invites/revoke
 * body: { token: string }
 * - Only the league owner can revoke.
 */
export async function POST(req: Request) {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });

  const inv = INVITES.get(token);
  if (!inv) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const me = viewer();
  const lg = getLeague(inv.leagueId);
  if (!lg || lg.ownerEmail !== me) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  revokeInvite(token);
  return NextResponse.json({ ok: true });
}
