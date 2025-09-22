import { NextRequest, NextResponse } from 'next/server';
import { supabaseRoute } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = params;
  const name = (req.nextUrl.searchParams.get('name') || '').trim();

  let sb, res: NextResponse;
  try {
    ({ client: sb, response: res } = supabaseRoute(req));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Supabase init error' }, { status: 500 });
  }

  // (Auth optional here; you can require it by uncommenting lines below.)
  // const { data: { user }, error: uerr } = await sb.auth.getUser();
  // if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });
  // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!id || !name) {
    return NextResponse.json({ available: false, reason: 'missing' }, { status: 400 });
  }

  // Easiest exact, case-insensitive check: fetch names for the league and compare in code.
  const { data, error } = await sb
    .from('league_members')
    .select('team_name')
    .eq('league_id', id);

  if (error) {
    return NextResponse.json({ available: false, reason: error.message }, { status: 400 });
  }

  const lower = name.toLocaleLowerCase();
  const taken = (data || []).some(
    (r: any) => (r?.team_name || '').toString().toLocaleLowerCase() === lower
  );

  return NextResponse.json({ available: !taken }, { status: 200, headers: Object.fromEntries(res.headers) });
}
