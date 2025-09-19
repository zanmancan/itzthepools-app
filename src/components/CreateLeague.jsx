import React, { useState } from 'react';

export default function CreateLeague({ onCreated }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');

  async function create() {
    setErr('');
    try {
      setBusy(true);
      const r = await fetch('/api/create-league', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Create failed');
      setInviteUrl(`${location.origin}/?join=${data.token}`);
      onCreated && onCreated(data.league_id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-6">
      <div className="h1 mb-3">Create Private League</div>
      <input className="input mb-3" placeholder="League name" value={name} onChange={e=>setName(e.target.value)} />
      <button className="btn" onClick={create} disabled={busy || !name.trim()}>{busy?'Creating…':'Create league'}</button>
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      {inviteUrl && (
        <div className="mt-4">
          <div className="text-sm opacity-80 mb-1">Invite link</div>
          <code className="break-all">{inviteUrl}</code>
        </div>
      )}
    </div>
  );
}
