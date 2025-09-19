import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import NewLeagueCard from './NewLeagueCard';
import MyLeaguesCard from './MyLeaguesCard';
import ActiveInvitesCard from './ActiveInvitesCard';
import ProfileCard from './ProfileCard';
import JoinFromToken from './JoinFromToken';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('profiles')
      .select('id, email, team_name, avatar_url').eq('id', user.id).single();
    if (!error) setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function logout() { await supabase.auth.signOut(); location.href = '/'; }

  return (
    <div className="container">
      <header className="flex items-center justify-between mb-6">
        <div className="h1">ItzThePools</div>
        <button className="btn" onClick={logout}>Sign out</button>
      </header>

      {profile && (
        <div className="card mb-6">
          <div className="h1">Hi {profile.team_name || profile.email} 👋</div>
          <p className="opacity-80">Create a private league or use an invite link to join one.</p>
        </div>
      )}

      {/* Accept invite by token in URL */}
      <JoinFromToken />

      <div className="grid md:grid-cols-2 gap-6">
        <NewLeagueCard />
        <MyLeaguesCard />
        <ActiveInvitesCard />
        <ProfileCard profile={profile} onSaved={load} loading={loading} />
      </div>
    </div>
  );
}
