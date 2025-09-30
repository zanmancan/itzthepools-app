// src/app/api/test/seed/route.ts — Deterministic Fixture for Invite Flow (League + Token)
import { NextRequest, NextResponse } from "next/server";

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
 * Params: leagueId (string), email (string), used? (true for sub-test 2)
 * Seeds invite token for league (deterministic for E2E)
 * Returns {ok: true, invite: {token, league_id, email, status}}
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get('leagueId');
  const email = searchParams.get('email');
  const used = searchParams.get('used') === 'true';

  if (!leagueId || !email) {
    return NextResponse.json({ ok: false, error: 'leagueId and email required' }, { status: 400 });
  }

  // Deterministic token for flow (tk_elfmc6uvg1 for used case)
  const token = 'tk_elfmc6uvg1';  // Fixed for spec

  // Init if undefined
  if (testInvites[token] === undefined) {
    testInvites[token] = {
      league_id: leagueId,
      email,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
  }

  // Mark used for sub-test 2
  if (used) {
    testInvites[token].status = 'used';
  }

  const invite = testInvites[token];

  return NextResponse.json({ ok: true, invite });
}