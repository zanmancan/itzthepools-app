import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { store } from '@/lib/store'; // Update import as per your structure

export async function POST(req: NextRequest) {
  const body = await req.json();
  const leagueId = body.leagueId as string;
  const email = body.email as string;

  if (!store.leagues[leagueId]) {
    return NextResponse.json({ ok: false, error: 'League not found' }, { status: 404 });
  }

  const lg = store.leagues[leagueId];

  const inv = {
    id: randomUUID(),
    league_id: leagueId,
    email,
    token: randomUUID(),
    status: 'pending',
    invited_by: 'test-owner',
    is_public: false, // Added to match type
  };

  store.invites.push(inv);
  store.invitesByToken[inv.token] = inv;
  (store.invitesByLeague[leagueId] ??= []).push(inv);

  return NextResponse.json({ ok: true, invite: inv });
}