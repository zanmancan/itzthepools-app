import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { store } from '@/lib/store'; // Update import as per your structure

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = body.name as string;
  const sport = body.sport as string;
  const season = body.season as string;

  const leagueId = randomUUID();

  if (!store.leagues[leagueId]) {
    const lg = {
      id: leagueId,
      name,
      sport,
      season, // Added to match type
      owner_id: 'test-owner',
    };

    store.leagues[leagueId] = lg;

    return NextResponse.json({ ok: true, league: lg });
  }

  return NextResponse.json({ ok: false, error: 'League already exists' }, { status: 400 });
}