// src/components/InviteForm.tsx
"use client";

import { useState } from "react";

type Props = { leagueId: string };

export default function InviteForm({ leagueId }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setAcceptUrl(null);

    try {
      const res = await fetch("/api/invites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ league_id: leagueId, email }),
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Unknown error creating invite");
        return;
      }

      // API returns { ok, token, acceptUrl }
      setAcceptUrl(json.acceptUrl);
      setEmail("");
    } catch (err: any) {
      setError(err?.message ?? "Network error");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!acceptUrl) return;
    try {
      const absolute = new URL(acceptUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(absolute);
      alert("Invite link copied to clipboard!");
    } catch {
      alert("Could not copy. Manually copy the URL shown.");
    }
  }

  return (
    <form onSubmit={onCreate} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          required
          placeholder="invitee@email.com"
          className="flex-1 rounded border border-gray-700 bg-black px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create invite"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {acceptUrl && (
        <div className="rounded border border-gray-700 p-3">
          <div className="text-xs text-gray-400">Invite link</div>
          <div className="break-all text-sm">{acceptUrl}</div>
          <div className="mt-2 flex gap-2">
            <a className="rounded px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600" href={acceptUrl} target="_blank">
              Open
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="rounded px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600"
            >
              Copy link
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
