import React, { useState } from 'react';
import { supabase } from './supabase';
import AuthGate from './components/AuthGate';
import TeamNameForm from './components/TeamNameForm';
import CreateLeague from './components/CreateLeague';
import JoinFromToken from './components/JoinFromToken';

// Auto-attach Supabase JWT to /api/* so functions know the user
const _fetch = window.fetch;
window.fetch = async (input, init = {}) => {
  if (String(input).startsWith('/api/')) {
    const { data: { session } } = await supabase.auth.getSession();
    init.headers = Object.assign({}, init.headers, {
      'Authorization': session ? `Bearer ${session.access_token}` : ''
    });
  }
  return _fetch(input, init);
};

export default function App() {
  const [team, setTeam] = useState(null);
  async function logout() { await supabase.auth.signOut(); location.reload(); }

  return (
    <AuthGate>
      <div className="container">
        <header className="flex items-center justify-between mb-6">
          <div className="h1">ItzThePools</div>
          <button className="btn" onClick={logout}>Sign out</button>
        </header>

        {!team ? (
          <TeamNameForm onReady={setTeam} />
        ) : (
          <>
            <div className="card">
              <div className="h1">Hi {team} 👋</div>
              <p className="opacity-80">Create a private league or use an invite link to join one.</p>
            </div>
            <JoinFromToken />
            <CreateLeague onCreated={() => {}} />
          </>
        )}
      </div>
    </AuthGate>
  );
}
