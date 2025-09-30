import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // Should resolve after tsconfig update
import { randomUUID } from 'crypto';
import { z } from 'zod';

const createInviteSchema = z.object({
  leagueId: z.string().uuid(),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_USE_SUPABASE !== '1') {
    return NextResponse.json({ ok: true, invite: { token: randomUUID(), status: 'pending', league_id: 'stub-league' } });
  }

  try {
    const body = await req.json();
    const { leagueId, email } = createInviteSchema.parse(body);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('invites')
      .insert({ league_id: leagueId, email, token: randomUUID(), status: 'pending', invited_by: 'test-owner' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, invite: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to create invite' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const action = searchParams.get('action') || 'by-token';

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
  }

  if (process.env.NEXT_PUBLIC_USE_SUPABASE !== '1') {
    const mockInvite = { league_id: 'stub-league', status: action === 'accept' ? 'accepted' : 'pending', token };
    if (action === 'accept' && mockInvite.status === 'accepted') {
      return NextResponse.json({ ok: false, error: 'Invite already accepted' });
    }
    return NextResponse.json({ ok: true, invite: mockInvite });
  }

  try {
    const supabase = createClient();
    const { data: invite, error } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invite) {
      return NextResponse.json({ ok: false, error: 'Invite not found' }, { status: 404 });
    }

    if (action === 'by-token') {
      return NextResponse.json({ ok: true, invite });
    }

    if (action === 'accept') {
      if (invite.status !== 'pending') {
        return NextResponse.json({ ok: false, error: 'Invite already accepted' });
      }

      const { error: updateError } = await supabase
        .from('invites')
        .update({ status: 'accepted' })
        .eq('token', token);

      if (updateError) throw updateError;

      const { data: updatedInvite } = await supabase
        .from('invites')
        .select('*')
        .eq('token', token)
        .single();

      return NextResponse.json({ ok: true, invite: updatedInvite });
    }

    return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ ok: false, error: `${action} failed: ${msg}` }, { status: 500 });
  }
}