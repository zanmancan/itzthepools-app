import { createClient } from '@supabase/supabase-js';
const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE;

export async function handler(event) {
  try {
    const auth = event.headers.authorization || '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!jwt) return j(401, { error: 'Missing auth token' });

    const admin = createClient(URL, SERVICE);
    const { data: { user }, error: uerr } = await admin.auth.getUser(jwt);
    if (uerr || !user) return j(401, { error: 'Invalid session' });

    // get leagues you own
    const { data: owned, error: oerr } = await admin
      .from('leagues').select('id, name').eq('owner', user.id);
    if (oerr) return j(500, { error: oerr.message });

    const ids = (owned || []).map(x => x.id);
    if (ids.length === 0) return j(200, { invites: [] });

    // pending invites for those leagues
    const { data: inv, error: ierr } = await admin
      .from('invites')
      .select('id, league_id, token, expires_at, accepted_at')
      .in('league_id', ids)
      .is('accepted_at', null)
      .order('expires_at', { ascending: true });

    if (ierr) return j(500, { error: ierr.message });

    const byId = Object.fromEntries(owned.map(x => [x.id, x.name]));
    const invites = (inv || []).map(x => ({
      ...x, league_name: byId[x.league_id] || x.league_id
    }));

    return j(200, { invites });
  } catch (e) {
    return j(500, { error: String(e) });
  }
}
function j(statusCode, body) {
  return { statusCode, headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) };
}
