import React, { useEffect, useState } from 'react';

export default function JoinFromToken() {
  const [status, setStatus] = useState('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('join');
    if (!token) return;
    (async () => {
      try {
        setStatus('busy');
        const r = await fetch('/api/join-league', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Join failed');
        setStatus('ok'); setMsg('You joined the league!');
      } catch (e) {
        setStatus('error'); setMsg(e.message);
      }
    })();
  }, []);

  if (!new URLSearchParams(location.search).get('join')) return null;
  return (
    <div className="card mt-6">
      <div className="h1 mb-2">League Invitation</div>
      <p className="opacity-80">{status==='ok' ? 'Success! Welcome aboard.' : msg || 'Processing…'}</p>
    </div>
  );
}
