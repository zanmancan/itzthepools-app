// src/app/api/test/invites/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listAllInvites, getLeague } from "@/app/api/test/_store";

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
 * GET /api/test/invites/list
 * DEV-only:
 * - Returns all invites with a computed `canRevoke` flag.
 * - If a league has no reliable ownerEmail, we treat the current test user as owner,
 *   so admin flows (revoke) are deterministic for E2E.
 *
 * { invites: Array<{ token, email, leagueId, leagueName, expiresAt, consumedAt, canRevoke }> }
 */
export async function GET() {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  const me = viewer();
  const UNKNOWN = "__unknown__@local.test";

  const invites = listAllInvites().map((i) => {
    const lg = getLeague(i.leagueId);
    const owner = lg?.ownerEmail?.trim();
    // DEV E2E rule:
    // - If we have a cookie user AND league owner is missing/placeholder,
    //   treat the current user as owner (so canRevoke=true).
    const canRevoke =
      !!me &&
      (
        !owner ||
        owner === UNKNOWN ||
        owner === me
      );

    return { ...i, canRevoke };
  });

  return NextResponse.json({ invites });
}
