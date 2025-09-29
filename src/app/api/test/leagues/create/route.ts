import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { upsertLeague, Role } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/leagues/create
 * UI-facing route used by the "Create League" form.
 *
 * Body:
 *   {
 *     name: string;                        // required
 *     id?: string;                         // optional; if omitted, we generate one
 *     ownerId?: string;                    // optional override
 *     ownerEmail?: string;                 // optional; mapped to ownerId if provided
 *     seedMembers?: Record<string, Role>;  // optional
 *   }
 *
 * Response (200):
 *   { ok: true, league: { id, name, ownerId, members } }
 *
 * Notes:
 * - We derive ownerId from (ownerId || ownerEmail || test user headers/cookies || "owner_1").
 * - Uses the same in-memory _store.ts as the /api/test/* helpers.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      id?: string;
      ownerId?: string;
      ownerEmail?: string;
      seedMembers?: Record<string, Role>;
    };

    if (!body?.name) {
      return NextResponse.json(
        { ok: false, error: "Missing 'name' in request body" },
        { status: 400 }
      );
    }

    const leagueId = body.id || genLeagueId();
    const ownerId = resolveOwnerId(body.ownerId, body.ownerEmail);

    // Always include the owner as "owner"
    const members: Record<string, Role> = { [ownerId]: "owner" };
    if (body.seedMembers) {
      for (const [k, v] of Object.entries(body.seedMembers)) {
        members[k] = v as Role;
      }
    }

    const league = upsertLeague({
      id: leagueId,
      name: body.name,
      ownerId,
      members,
    });

    return NextResponse.json({ ok: true, league }, { status: 200 });
  } catch (err) {
    console.error("[/api/leagues/create] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create league" },
      { status: 500 }
    );
  }
}

/* ------------------------------ helpers ---------------------------------- */

function genLeagueId(): string {
  return (
    "lg_" +
    Math.random().toString(36).slice(2, 7) +
    Math.random().toString(36).slice(2, 7)
  );
}

/**
 * Resolve an owner id for the newly created league.
 * Priority:
 *   1) explicit ownerId in body
 *   2) ownerEmail in body → sanitized
 *   3) test/dev headers or cookies (various names we’ve seen)
 *   4) "owner_1" fallback (safe default used across tests)
 */
function resolveOwnerId(bodyOwnerId?: string, bodyOwnerEmail?: string): string {
  if (bodyOwnerId) return String(bodyOwnerId);

  if (bodyOwnerEmail) return emailToUserId(bodyOwnerEmail);

  const hdrs = headers();
  const fromHeader =
    hdrs.get("x-e2e-user-id") ||
    hdrs.get("x-test-user-id") ||
    hdrs.get("x-user-id") ||
    hdrs.get("x-e2e-user-email") ||
    hdrs.get("x-test-user-email") ||
    hdrs.get("x-user-email");

  if (fromHeader) {
    return fromHeader.includes("@")
      ? emailToUserId(fromHeader)
      : sanitizeId(fromHeader);
  }

  const ck = cookies();
  const fromCookie =
    ck.get("e2e_user_id")?.value ||
    ck.get("test_user_id")?.value ||
    ck.get("user_id")?.value ||
    ck.get("e2e_user_email")?.value ||
    ck.get("test_user_email")?.value ||
    ck.get("user_email")?.value;

  if (fromCookie) {
    return fromCookie.includes("@")
      ? emailToUserId(fromCookie)
      : sanitizeId(fromCookie);
  }

  return "owner_1";
}

function emailToUserId(email: string): string {
  return sanitizeId(email.toLowerCase());
}

function sanitizeId(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]+/gi, "_");
  return cleaned.replace(/^_+|_+$/g, "") || "user";
}
