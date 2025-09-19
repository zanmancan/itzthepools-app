import { createClient } from '@supabase/supabase-js';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 36);
const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE;

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return j(405, { error: 'Method not allowed' });
    const authHeader = event.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return j(401, { error: 'Missing auth token' });

    const admin = createClient(url, service);
    const client = createClient(url, token);
    const { data: { user }, error: uerr } = await client.auth.getUser();
    if (uerr || !user) return j(401, { error: 'Invalid session' });

    const { name } = JSON.parse(event.body || '{}');
    if (!name || String(name).trim().length < 2) return j(400, { error: 'League name too short' });

    const { data: league, error: lerr } = await admin
      .from('leagues').insert({ name, owner: user.id }).select().single();
    if (lerr) return j(500, { error: 'Create league failed', detail: lerr.message });

    await admin.from('league_members').upsert({ league_id: league.id, user_id: user.id, role: 'owner' });

    const tokenStr = nanoid();
    const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const { error: ierr } = await admin.from('invites').insert({
      league_id: league.id, token: tokenStr, expires_at: expires
    });
    if (ierr) return j(500, { error: 'Invite create failed', detail: ierr.message });

    return j(200, { ok: true, league_id: league.id, token: tokenStr, expires_at: expires });
  } catch (e) {
    return j(500, { error: 'Server error', detail: String(e) });
  }
}
function j(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
