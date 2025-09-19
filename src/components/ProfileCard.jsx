import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function ProfileCard({ profile, loading, onSaved }) {
  const [team, setTeam] = useState(profile?.team_name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function saveTeam() {
    setMsg('');
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('profiles')
        .update({ team_name: team }).eq('id', user.id);
      if (error) throw error;
      setMsg('Saved.');
      onSaved && onSaved();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(ev) {
    setMsg('');
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const path = `${user.id}.${file.name.split('.').pop() || 'png'}`;
      const { error: upErr } = await supabase.storage.from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: uerr } = await supabase.from('profiles')
        .update({ avatar_url: pub.publicUrl }).eq('id', user.id);
      if (uerr) throw uerr;
      setMsg('Avatar updated.');
      onSaved && onSaved();
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function sendReset() {
    setMsg('');
    try {
      const email = profile?.email;
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/recover`
      });
      setMsg('Password reset email sent.');
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="card">
      <div className="h1 mb-3">Profile</div>

      <label className="block text-sm mb-1">Team name</label>
      <div className="flex gap-2 mb-3">
        <input className="input flex-1" value={team} onChange={e=>setTeam(e.target.value)} />
        <button className="btn" onClick={saveTeam} disabled={saving || !team.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <label className="block text-sm mb-1">Avatar</label>
      <input type="file" accept="image/*" onChange={uploadAvatar} className="mb-3" />

      <div className="mt-4">
        <button className="btn" onClick={sendReset}>Send password reset</button>
      </div>

      {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}
    </div>
  );
}
