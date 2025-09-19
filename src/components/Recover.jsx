import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function Recover() {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function save() {
    setMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg('Password updated. You may close this tab and sign in.');
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="h1 mb-3">Set a new password</div>
        <input className="input mb-3" type="password"
               placeholder="New password" value={password}
               onChange={e=>setPassword(e.target.value)} />
        <button className="btn" onClick={save} disabled={password.length < 8}>
          Save password
        </button>
        {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}
      </div>
    </div>
  );
}
