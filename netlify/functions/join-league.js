import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE;

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return j(405, { error: 'Method not allowed' });

    const { token } = JSON.parse(event.body || '{}');
    if (!token) return j(400, { error: 'Missing token' });

    const authHeader = event.headers.authorization || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!jwt) return j(401, { error: 'Missing auth token' });

    const admin = createClient(SUPABASE_URL, SERVICE);

    // ✅ verify the session using JWT
    const { data: { user }, error: uerr } = await admin.auth.getUser(jwt);
    if (uerr || !user) return j(401, { error: 'Invalid session' });

    // find invite
    const { data: invite, error: ierr } = await admin
      .from('invites').select('*').eq('token', token).single();
    if (ierr || !invite) return j(400, { error: 'Invalid invite' });
    if (invite.accepted_at) return j(409, { error: 'Invite already used' });
    if (new Date(invite.expires_at) < new Date()) return j(410, { error: 'Invite expired' });

    // add membership + mark accepted
    await admin
      .from('league_members')
      .upsert({ league_id: invite.league_id, user_id: user.id, role: 'member' });
    await admin
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    return j(200, { ok: true, league_id: invite.league_id });
  } catch (e) {
    console.error('[join-league] error', e);
    return j(500, { error: 'Server error', detail: String(e) });
  }
}

function j(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
