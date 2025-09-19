import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-server";

/**
 * GET /api/league-name?name=Zandy%20Family%20Pool&scope=global|perRuleset&ruleset=march_madness&season=2026
 * Returns: { available: boolean }
 *
 * - scope=global  -> name must be unique across all leagues
 * - scope=perRuleset -> name must be unique for (ruleset + season) only
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const name = (url.searchParams.get("name") || "").trim();
    const scope = (url.searchParams.get("scope") || "global").toLowerCase();
    const ruleset = (url.searchParams.get("ruleset") || "").trim();
    const season = (url.searchParams.get("season") || "").trim();

    if (!name) return NextResponse.json({ available: false });

    const sb = supabaseRoute();
    let query = sb.from("leagues").select("id", { count: "exact", head: true }).ilike("name", name);

    // global uniqueness: any league with same name (case-insensitive)
    if (scope === "global") {
      // no extra filters
    } else if (scope === "perruleset") {
      // unique within the same ruleset+season
      if (!ruleset || !season) return NextResponse.json({ available: false });
      query = query.eq("ruleset", ruleset).eq("season", season);
    }

    const { count, error } = await query;
    if (error) return NextResponse.json({ available: false });

    return NextResponse.json({ available: (count ?? 0) === 0 });
  } catch {
    return NextResponse.json({ available: false });
  }
}
