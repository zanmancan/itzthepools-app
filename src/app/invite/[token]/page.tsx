// src/app/invite/[token]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

type Props = { params: { token: string } };

// very light validation: letters/numbers/spaces/_/-, 2..30 chars
function validateTeamName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Team name must be at least 2 characters.";
  if (trimmed.length > 30) return "Team name must be 30 characters or fewer.";
  if (!/^[A-Za-z0-9 _-]+$/.test(trimmed))
    return "Only letters, numbers, spaces, dashes and underscores are allowed.";
  return null;
}

export default function InvitePage({ params }: Props) {
  const token = params.token;
  const router = useRouter();
  const pathname = usePathname();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const teamError = useMemo(
    () => (authed ? validateTeamName(teamName) : null),
    [authed, teamName]
  );

  // Detect auth status (show team-name only after login)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/whoami", { credentials: "same-origin" });
        setAuthed(res.ok);
        if (res.ok) {
          const cached = localStorage.getItem(`invite-teamname:${token}`);
          if (cached) setTeamName(cached);
        }
      } catch {
        setAuthed(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  function onTeamChange(v: string) {
    setTeamName(v);
    try { localStorage.setItem(`invite-teamname:${token}`, v); } catch {}
  }

  async function acceptInvite() {
    setBusy(true);
    setError(null);
    setDetail(null);
    setOkMsg(null);

    try {
      // If not logged in, send to signup; we’ll come back to this page (Step 3 -> Step 5).
      if (!authed) {
        router.push(`/signup?next=${encodeURIComponent(pathname)}`);
        return;
      }

      // Logged in: require a valid team name here (UI + server both enforce).
      if (teamError) {
        setError(teamError);
        setBusy(false);
        return;
      }

      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token, teamName }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || data?.error) {
        setError(data?.error || "Failed to accept invite.");
        if (data?.detail) setDetail(String(data.detail));
        setBusy(false);
        return;
      }

      setOkMsg("Invite accepted! Redirecting to your dashboard…");
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (e: any) {
      setError(e?.message || "Unexpected error.");
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/" className="px-4 py-2 rounded-full border">Home</Link>
        <Link href="/login" className="px-4 py-2 rounded-full border">Login (soon)</Link>
        <Link href="/dashboard" className="px-4 py-2 rounded-full border">Dashboard (soon)</Link>
      </div>

      <h1 className="text-4xl font-bold mb-6">League invite</h1>

      <div className="rounded-2xl border p-5 bg-black/20 mb-6">
        <div className="text-sm text-neutral-400 mb-1">Invite token</div>
        <div className="font-mono text-neutral-200 break-all">{token}</div>
      </div>

      {/* Team name section only after login (Step 5) */}
      {authed ? (
        <div className="mb-6">
          <label className="block text-sm text-neutral-300 mb-2" htmlFor="teamName">
            Team name <span className="text-red-400">*</span>
          </label>
          <input
            id="teamName"
            value={teamName}
            onChange={(e) => onTeamChange(e.target.value)}
            placeholder="e.g., Dunk Lords"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 outline-none focus:border-blue-500"
            autoComplete="off"
            maxLength={30}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
            <span>{teamName.trim().length}/30</span>
            {teamError && <span className="text-red-400">{teamError}</span>}
          </div>
        </div>
      ) : (
        <p className="mb-6 text-sm text-neutral-400">
          You’ll set your team name after signing in.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => void acceptInvite()}
          disabled={busy || (authed ? !!teamError : false)}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg"
        >
          {busy ? "Accepting…" : "Accept invite"}
        </button>
        <Link
          href="/dashboard"
          className="border border-neutral-600 hover:bg-neutral-800 px-5 py-2 rounded-lg"
        >
          Decline
        </Link>
      </div>

      {error && (
        <div className="mt-6 text-red-400">
          <div className="font-semibold">Error</div>
          <div className="text-sm">{error}</div>
          {detail && <div className="text-xs mt-1 opacity-80">{detail}</div>}
        </div>
      )}

      {okMsg && (
        <div className="mt-6 text-green-400">
          <div className="font-semibold">Success</div>
          <div className="text-sm">{okMsg}</div>
        </div>
      )}
    </div>
  );
}
