"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptClient({ token }: { token: string }) {
  const [team, setTeam] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const r = useRouter();

  async function accept() {
    setErr(null);
    const res = await fetch("/api/test/invites/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, teamName: team }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.leagueId) {
      setErr(j?.error ?? "Failed to accept");
      return;
    }
    r.replace(`/leagues/${j.leagueId}`);
  }

  return (
    <div>
      {err && (
        <div role="alert" className="mb-3 rounded-md border border-red-700 bg-red-950/60 px-3 py-2 text-sm text-red-200" data-testid="toast">
          {err}
        </div>
      )}

      <label className="mb-2 block text-sm text-neutral-300">Team name</label>
      <input
        data-testid="team-name-input"
        value={team}
        onChange={(e) => setTeam(e.target.value)}
        placeholder="My Team"
        className="mb-3 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none"
      />

      <button
        onClick={accept}
        className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
        data-testid="accept-invite"
      >
        Accept
      </button>
    </div>
  );
}
