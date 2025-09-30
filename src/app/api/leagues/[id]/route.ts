// app/api/leagues/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";
import slugify from "slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === "1";

// Reuse interfaces
interface League {
  id: string;
  name: string;
  season: string;
  ruleset: string | null;
  is_public: boolean;
  created_at: string;
  created_by: string;
  slug?: string;
}

interface Membership {
  league_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface User {
  id: string;
}

// Supabase result types
interface QueryResult {
  data: League | null;
  error: any;
}

interface MemResult {
  data: { role: string } | null;
  error: any;
}

// Global in-memory (shared across routes)
declare global {
  var inMemoryLeagues: League[];
  var inMemoryMembers: Membership[];
  var nextId: number;
}
if (typeof window === 'undefined') {
  (globalThis as any).inMemoryLeagues = (globalThis as any).inMemoryLeagues || [];
  (globalThis as any).inMemoryMembers = (globalThis as any).inMemoryMembers || [];
  (globalThis as any).nextId = (globalThis as any).nextId || 1;
}
const inMemoryLeagues = (globalThis as any).inMemoryLeagues as League[];
const inMemoryMembers = (globalThis as any).inMemoryMembers as Membership[];

/**
 * GET /api/leagues/[id]
 * Fetches single league by id/slug, role-guarded.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { client: sb, response } = supabaseRoute(req);
  const leagueKey = params.id;

  // Auth
  let user: User | null = null;
  if (USE_SUPABASE) {
    const { data: { user: u }, error: uerr } = await sb.auth.getUser();
    if (uerr) return jsonWithRes(response, { error: uerr.message }, 500);
    user = u ? { id: u.id } : null;
  } else {
    user = { id: process.env.E2E_TEST_USER_ID || "stub-user-1" };
  }
  if (!user) return jsonWithRes(response, { error: "Unauthorized" }, 401);

  if (USE_SUPABASE) {
    // Real: By id (slug TODO)
    const leagueRes: QueryResult = await sb
      .from("leagues")
      .select("id, name, season, ruleset, is_public, created_at, created_by")
      .eq("id", leagueKey)
      .maybeSingle() as QueryResult;

    if (leagueRes.error || !leagueRes.data) return jsonWithRes(response, { error: "League not found" }, 404);

    const data = leagueRes.data;

    // Role
    const memResult: MemResult = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", data.id)
      .eq("user_id", user.id)
      .single() as MemResult;

    if (memResult.error || !memResult.data) return jsonWithRes(response, { error: "Access denied" }, 403);

    return jsonWithRes(response, { ok: true, league: { ...data, role: memResult.data.role } });
  } else {
    // In-memory: By id or slug
    const league = inMemoryLeagues.find((l) => l.id === leagueKey || l.slug === leagueKey) ?? null;
    if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

    const membership = inMemoryMembers.find((m) => m.league_id === league.id && m.user_id === user.id) ?? null;
    if (!membership) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    return NextResponse.json({ ok: true, league: { ...league, role: membership.role } });
  }
}