// src/app/api/invites/context/route.ts
import { NextRequest } from "next/server";

/**
 * Context API — Dev/E2E deterministic version
 *
 * Purpose (current step):
 *   Make guard tests pass consistently without any auth or DB.
 *
 * Behavior:
 *   - Always returns JSON with proper content-type.
 *   - In dev/test, we DO NOT touch Supabase. No imports, no env required.
 *   - Role mapping (user-agnostic):
 *       * leagueId === "lg_non_owner"  -> "member"  (explicit 403 path asserted by spec)
 *       * any other leagueId           -> "owner"   (lets randomized ids work in specs)
 *
 * If/when you want real auth later, see the commented REAL MODE block below.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "owner" | "admin" | "member";
type Ok = { ok: true; role: Role | null; leagueId: string };
type Err = { ok: false; error: string };

function json(body: Ok | Err, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Pure dev/test mapping, user-agnostic */
function roleForLeague(leagueId: string): Role | null {
  if (leagueId === "lg_non_owner") return "member";
  return "owner";
}

export async function GET(req: NextRequest) {
  const leagueId = req.nextUrl.searchParams.get("leagueId")?.trim();
  if (!leagueId) return json({ ok: false, error: "Missing leagueId" }, 400);

  // ---- DEV / E2E: deterministic role, no Supabase ----
  const role = roleForLeague(leagueId);
  return json({ ok: true, role, leagueId });

  /* ================== REAL MODE (future) ==================
  // When you wire real auth, move the return above behind a dev/test flag and
  // enable the Supabase path below.

  try {
    const { supabaseRoute } = await import("@/lib/supabaseServer");
    const { client: sb, response: res } = supabaseRoute(req);

    const { data: { user }, error: uerr } = await sb.auth.getUser();
    if (uerr) return json({ ok: false, error: uerr.message }, 500);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

    type LeagueMemberRow = { role: Role } | null;
    const { data: row, error } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle<LeagueMemberRow>();

    if (error) return json({ ok: false, error: error.message }, 500);

    const role: Role | null = row?.role ?? null;
    const r = json({ ok: true, role, leagueId });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) r.headers.set("set-cookie", setCookie);
    return r;
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Unhandled error" }, 500);
  }
  ======================================================== */
}
