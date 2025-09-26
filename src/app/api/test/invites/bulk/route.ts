// src/app/api/test/invites/bulk/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addInvitesBulk, getLeague, upsertLeague } from "@/app/api/test/_store";

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
 * POST /api/test/invites/bulk
 * body: { leagueId: string, emails: string[] }
 *
 * DEV/E2E only (NODE_ENV !== "production"):
 * - Ensures the league exists and persists invites.
 * - Snaps league.ownerEmail to the current test user (if present).
 * - **Sets tp_test_user cookie** to that user so the next page load
 *   (e.g., /dashboard) evaluates canRevoke=true for them.
 *
 * PROD: returns 404 (this endpoint is dev-only).
 */
export async function POST(req: Request) {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  const body = await req.json().catch(() => ({}));
  const leagueId = String(body?.leagueId || "").trim();
  const emails = Array.isArray(body?.emails) ? body.emails : [];
  if (!leagueId || emails.length === 0) {
    return NextResponse.json({ ok: false, error: "leagueId and emails required" }, { status: 400 });
  }

  const lg = getLeague(leagueId);
  if (!lg) {
    return NextResponse.json({ ok: false, error: "league not found" }, { status: 404 });
  }

  // Align ownership to the current test user (admin) if present
  const me = viewer();
  if (me) {
    upsertLeague({
      id: lg.id,
      name: lg.name,
      ownerEmail: me,
      teams: lg.teams,
    });
  }

  const created = addInvitesBulk(getLeague(leagueId)!, emails);

  // Make sure downstream requests (e.g., /dashboard) see the same admin identity
  const res = NextResponse.json({ ok: true, created });
  if (me) {
    res.headers.append(
      "Set-Cookie",
      `tp_test_user=${encodeURIComponent(me)}; Path=/; SameSite=Lax`
    );
  }
  return res;
}
