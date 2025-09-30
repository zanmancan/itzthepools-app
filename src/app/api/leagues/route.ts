// app/api/leagues/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";
import slugify from "slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === "1";

// Interfaces (shared)
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

interface BodyType {
  name?: string | unknown;
  season?: string | unknown;
  ruleset?: string | unknown;
  is_public?: boolean | unknown;
}

interface User {
  id: string;
}

// Supabase result types
interface InsertResult {
  data: League | null;
  error: any;
}

interface QueryResult {
  data: any[];
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
 * POST /api/leagues
 * Creates league + owner membership; returns {ok: true, leagueId: slug}
 */
export async function POST(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

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

  // Parse body (typed with unknown fallback)
  let body: BodyType = {};
  try {
    body = await req.json() as BodyType;
  } catch {}

  const name = (body.name ?? '').toString().trim();
  if (!name) return jsonWithRes(response, { error: "name is required" }, 400);

  const season = (body.season ?? '').toString().trim() || new Date().getFullYear().toString();
  const ruleset = body.ruleset ? body.ruleset.toString() : null;
  const is_public = Boolean(body.is_public);

  if (USE_SUPABASE) {
    // Real Supabase
    const leagueRow = {
      name,
      season,
      ruleset,
      is_public,
      created_at: new Date().toISOString(),
      created_by: user.id,
    };

    const insLeague: InsertResult = await (sb.from("leagues") as any)
      .insert(leagueRow)
      .select("id, name, season, ruleset, is_public, created_at, created_by")
      .maybeSingle() as InsertResult;

    if (insLeague.error) return jsonWithRes(response, { error: insLeague.error.message }, 400);

    const league = insLeague.data;
    if (!league?.id) return jsonWithRes(response, { error: "Failed to create league" }, 500);

    // Membership
    const insMember: InsertResult = await (sb.from("league_members") as any)
      .insert({
        league_id: league.id,
        user_id: user.id,
        role: "owner",
        created_at: new Date().toISOString(),
      })
      .select("league_id, user_id, role, created_at")
      .maybeSingle() as InsertResult;

    if (insMember.error) {
      await (sb.from("leagues") as any).delete().eq("id", league.id);
      return jsonWithRes(response, { error: insMember.error.message }, 400);
    }

    const slug = `lg-${slugify(name, { lower: true, strict: true })}`;
    return jsonWithRes(response, { ok: true, leagueId: slug });
  } else {
    // In-memory (global shared)
    const id = ((globalThis as any).nextId++).toString();
    const slug = `lg-${slugify(name, { lower: true, strict: true })}`;
    const createdAt = new Date().toISOString();

    const league: League = {
      id,
      name,
      season,
      ruleset,
      is_public,
      created_at: createdAt,
      created_by: user.id,
      slug,
    };

    inMemoryLeagues.push(league);

    const membership: Membership = {
      league_id: id,
      user_id: user.id,
      role: "owner",
      created_at: createdAt,
    };
    inMemoryMembers.push(membership);

    return NextResponse.json({ ok: true, leagueId: slug });
  }
}

/**
 * GET /api/leagues
 * Lists user's leagues + roles (sorted).
 */
export async function GET(req: NextRequest) {
  const { client: sb, response } = supabaseRoute(req);

  // Auth
  let user: User | null = null;
  if (USE_SUPABASE) {
    const { data: { user: u }, error: uerr } = await sb.auth.getUser();
    if (uerr) return jsonWithRes(response, { error: uerr.message, leagues: [] as League[] }, 500);
    user = u ? { id: u.id } : null;
  } else {
    user = { id: process.env.E2E_TEST_USER_ID || "stub-user-1" };
  }
  if (!user) return jsonWithRes(response, { error: "Unauthorized", leagues: [] as League[] }, 401);

  if (USE_SUPABASE) {
    // Real
    const q: QueryResult = await sb
      .from("league_members")
      .select("role, leagues:league_id(id, name, season, ruleset, is_public)")
      .eq("user_id", user.id) as QueryResult;

    if (q.error) return jsonWithRes(response, { error: q.error.message, leagues: [] as League[] }, 400);

    const rows = Array.isArray(q.data) ? q.data : [];
    const leagues: League[] = rows
      .map((r: any) => {
        const l = r?.leagues;
        if (!l?.id) return null;
        return {
          id: l.id,
          name: l.name,
          season: l.season,
          ruleset: l.ruleset ?? null,
          is_public: !!l.is_public,
          created_at: l.created_at || '',
          created_by: l.created_by || '',
        } as League;
      })
      .filter((x): x is League => x !== null);

    leagues.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    return jsonWithRes(response, { ok: true, leagues });
  } else {
    // In-memory (global shared)
    const userMembers = inMemoryMembers.filter((m) => m.user_id === user.id);
    const leagues: League[] = userMembers
      .map((m) => {
        const league = inMemoryLeagues.find((l) => l.id === m.league_id);
        return league ?? null;
      })
      .filter((x): x is League => x !== null);

    leagues.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    return NextResponse.json({ ok: true, leagues });
  }
}