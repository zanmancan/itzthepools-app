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

    // leagues you belong to with your role
    const { data, error } = await admin
      .from('league_members')
      .select('role, leagues(id, name)')
      .eq('user_id', user.id);
    if (error) return j(500, { error: error.message });

    const leagues = (data || []).map(r => ({
      id: r.leagues?.id, name: r.leagues?.name, role: r.role
    })).filter(x => x.id);

    return j(200, { leagues });
  } catch (e) {
    return j(500, { error: String(e) });
  }
}
function j(statusCode, body) {
  return { statusCode, headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) };
}
