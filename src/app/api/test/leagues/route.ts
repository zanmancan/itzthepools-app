import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // Should resolve after tsconfig update
import { z } from 'zod';

const createLeagueSchema = z.object({
  name: z.string().min(1),
  sport: z.string(),
  season: z.string(),
});

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_USE_SUPABASE !== '1') {
    const body = await req.json();
    return NextResponse.json({ ok: true, league: { id: 'stub-league', name: body.name, sport: body.sport, season: body.season } });
  }

  try {
    const body = await req.json();
    const { name, sport, season } = createLeagueSchema.parse(body);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('leagues')
      .insert({ name, sport, season, owner_id: 'test-owner' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, league: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to create league' }, { status: 500 });
  }
}