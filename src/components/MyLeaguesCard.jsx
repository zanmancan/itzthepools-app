import React, { useEffect, useState } from 'react';

export default function MyLeaguesCard() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/my-leagues');
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Load failed');
        setRows(data.leagues || []);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  return (
    <div className="card">
      <div className="h1 mb-3">My Leagues</div>
      {err && <p className="text-sm text-red-400 mb-2">{err}</p>}
      {rows.length === 0 ? (
        <p className="opacity-70 text-sm">No leagues yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(l => (
            <li key={l.id} className="flex items-center justify-between">
              <span className="font-medium">{l.name}</span>
              <span className="text-xs opacity-70">{l.role}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
