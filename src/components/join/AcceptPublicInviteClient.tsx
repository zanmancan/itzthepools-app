"use client";

import React from "react";
import Link from "next/link";

export default function AcceptPublicInviteClient({ token }: { token: string }) {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const j = await res.json();
      if (!res.ok || j?.error) setMsg(j?.error || `Failed (HTTP ${res.status})`);
      else setMsg("Success! You’ve joined the league.");
    } catch (e: any) {
      setMsg(e?.message || "Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-gray-300">This is a public invite link. Click below to join.</p>
      <div className="flex gap-3">
        <button
          onClick={accept}
          disabled={busy}
          className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500 disabled:opacity-60"
        >
          {busy ? "Accepting…" : "Accept invite"}
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800/50"
        >
          Go to Dashboard
        </Link>
      </div>
      {msg && <p className="mt-3 text-sm text-gray-300">{msg}</p>}
    </div>
  );
}
