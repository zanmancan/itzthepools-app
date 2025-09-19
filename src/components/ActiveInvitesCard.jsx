import React, { useEffect, useState } from 'react';

export default function ActiveInvitesCard() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');

  async function load() {
    setMsg('');
    const r = await fetch('/api/my-invites');
    const data = await r.json();
    if (!r.ok) return setMsg(data.error || 'Load failed');
    setRows(data.invites || []);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="card">
      <div className="h1 mb-3">Active Invites</div>
      {msg && <p className="text-sm text-red-400 mb-2">{msg}</p>}
      {rows.length === 0 ? (
        <p className="opacity-70 text-sm">No pending invites.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(x => (
            <li key={x.id} className="text-sm">
              <div className="font-medium">{x.league_name}</div>
              <div className="opacity-80">
                Token: <code>{x.token}</code>
                {' · '}Expires: {new Date(x.expires_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
