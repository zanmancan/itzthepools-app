// src/app/api/test/seed/route.ts — Deterministic Fixture for Invite Flow (League + Token)
import { NextRequest, NextResponse } from "next/server";
import slugify from "slugify";  // For token if gen

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === "1";

// Global in-memory for invites (shared with other /api/test/*)
declare global {
  var testInvites: Record<string, { league_id: string; email: string; status: 'pending' | 'used' | 'expired'; created_at: string }>;
}
if (typeof window === 'undefined') {
  (globalThis as any).testInvites = (globalThis as any).testInvites || {};
}
const testInvites = (globalThis as any).testInvites as Record<string, { league_id: string; email: string; status: 'pending' | 'used' | 'expired'; created_at: string }>;

/**
 * GET /api/test/seed
 * Params: leagueId (string), email (string)
 * Seeds invite token for league (deterministic for E2E)
 * If token exists, update status; else gen new
 * Returns {ok: true, token: string}
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get('leagueId');
  const email = searchParams.get('email');

  if (!leagueId || !email) {
    return NextResponse.json({ ok: false, error: 'leagueId and email required' }, { status: 400 });
  }

  // Deterministic token for flow (tk_elfmc6uvg1 for used case)
  const token = 'tk_elfmc6uvg1';  // Fixed for spec; gen random if needed

  // Init if undefined
  if (testInvites[token] === undefined) {
    testInvites[token] = {
      league_id: leagueId,
      email,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
  }

  // Mark used for sub-test 2 (spec calls with used flag? Or separate)
  if (searchParams.get('used') === 'true') {
    testInvites[token].status = 'used';
  }

  return NextResponse.json({ ok: true, token });
}