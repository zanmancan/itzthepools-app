import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session) return children;

  async function sendMagicLink(e) {
    e.preventDefault();
    setMsg('');
    try {
      setSending(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      setMsg('Magic link sent! Check your email.');
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="h1 mb-4">Sign in</div>
        <form onSubmit={sendMagicLink} className="space-y-3">
          <input className="input" placeholder="you@email.com"
                 value={email} onChange={e=>setEmail(e.target.value)} required />
          <button className="btn" disabled={sending}>{sending?'Sending…':'Email me a magic link'}</button>
        </form>
        {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}
      </div>
    </div>
  );
}
