import React, { useState } from "react";

export default function NewLeagueCard() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  async function create() {
    setErr("");
    try {
      setBusy(true);
      const r = await fetch("/api/create-league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Create failed");
      setInviteUrl(`${location.origin}/?join=${data.token}`);
      setName("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="h1 mb-3">New League</div>
      <input
        className="input mb-3"
        placeholder="League name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        className="btn"
        onClick={() => {
          void create();
        }}
        disabled={busy || !name.trim()}
      >
        {busy ? "Creating…" : "Create league"}
      </button>
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      {inviteUrl && (
        <div className="mt-4">
          <div className="text-sm opacity-80 mb-1">Invite link (copy/share)</div>
          <code className="break-all">{inviteUrl}</code>
        </div>
      )}
    </div>
  );
}
