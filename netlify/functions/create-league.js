import { createClient } from '@supabase/supabase-js';
import { customAlphabet } from 'nanoid';

// short, URL-safe token for invite link shown immediately after create
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 36);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE;

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return j(405, { error: 'Method not allowed' });

    // get JWT from browser (AuthGate added it to Authorization header)
    const authHeader = event.headers.authorization || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!jwt) return j(401, { error: 'Missing auth token' });

    const admin = createClient(SUPABASE_URL, SERVICE);

    // ✅ verify the session using the admin client
    const { data: { user }, error: uerr } = await admin.auth.getUser(jwt);
    if (uerr || !user) return j(401, { error: 'Invalid session' });

    const { name } = JSON.parse(event.body || '{}');
    if (!name || String(name).trim().length < 2) return j(400, { error: 'League name too short' });

    // create league (owner = user.id)
    const { data: league, error: lerr } = await admin
      .from('leagues')
      .insert({ name, owner: user.id })
      .select()
      .single();
    if (lerr) return j(500, { error: 'Create league failed', detail: lerr.message });

    // add owner membership
    await admin
      .from('league_members')
      .upsert({ league_id: league.id, user_id: user.id, role: 'owner' });

    // seed a 24h invite token so the UI has an immediate link to show
    const token = nanoid();
    const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const { error: ierr } = await admin
      .from('invites')
      .insert({ league_id: league.id, token, expires_at: expires });
    if (ierr) return j(500, { error: 'Invite create failed', detail: ierr.message });

    return j(200, { ok: true, league_id: league.id, token, expires_at: expires });
  } catch (e) {
    console.error('[create-league] error', e);
    return j(500, { error: 'Server error', detail: String(e) });
  }
}

function j(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
