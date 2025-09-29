// src/app/api/test/role/route.ts
import { NextRequest } from "next/server";

/**
 * Test-only helper: returns the role for a given leagueId.
 * Deterministic by league only (user-agnostic), to match E2E specs.
 *
 * GET /api/test/role?leagueId=lg_owner
 * -> { ok: true, leagueId, role: "owner" }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "owner" | "admin" | "member";
type Ok = { ok: true; leagueId: string; role: Role | null };
type Err = { ok: false; error: string };

function json(body: Ok | Err, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function roleForLeague(leagueId: string): Role | null {
  switch (leagueId) {
    case "lg_owner":
      return "owner";
    case "lg_admin":
      return "admin";
    case "lg_member":
      return "member";
    case "lg_non_owner":
      return "member";
    default:
      return "member";
  }
}

export async function GET(req: NextRequest) {
  try {
    const leagueId = req.nextUrl.searchParams.get("leagueId")?.trim();
    if (!leagueId) return json({ ok: false, error: "Missing leagueId" }, 400);
    const role = roleForLeague(leagueId);
    return json({ ok: true, leagueId, role });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Unhandled error" }, 500);
  }
}
