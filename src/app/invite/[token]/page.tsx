// src/app/invite/[token]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = { params: { token: string } };

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
  const searchParams = useSearchParams();

  // Build the canonical "next" (path + query) so we can round-trip back here
  const next = useMemo(() => {
    const q = searchParams?.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const teamError = useMemo(
    () => (authed ? validateTeamName(teamName) : null),
    [authed, teamName]
  );

  // On mount: probe auth and restore cached team name (per-invite)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/whoami", { credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json().catch(() => ({} as any));
          setAuthed(true);
          setEmail(data?.email ?? null);

          const cached = localStorage.getItem(`invite-teamname:${token}`);
          if (cached) setTeamName(cached);
        } else {
          setAuthed(false);
        }
      } catch {
        setAuthed(false);
      }
    })();
  }, [token]);

  function onTeamChange(v: string) {
    setTeamName(v);
    try {
      localStorage.setItem(`invite-teamname:${token}`, v);
    } catch {
      /* ignore */
    }
  }

  async function acceptInvite() {
    setBusy(true);
    setError(null);
    setDetail(null);
    setOkMsg(null);

    try {
      // If not signed in, send through signup preserving return path
      if (!authed) {
        router.push(`/signup?next=${encodeURIComponent(next)}`);
        return;
      }

      // Validate team name when authed
      if (teamError) {
        setError(teamError);
        setBusy(false);
        return;
      }

      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        // Post both shapes so the API can accept either
        body: JSON.stringify({ token, team_name: teamName, teamName }),
      });

      const data = await res.json().catch(() => ({} as any));

      // If the server requires verified email, route to verify screen
      if (res.status === 401) {
        const msg = String(data?.error || "").toLowerCase();
        if (msg.includes("verify") || msg.includes("unverified")) {
          const e = email ?? "";
          router.push(`/verify?email=${encodeURIComponent(e)}&next=${encodeURIComponent(next)}`);
          return;
        }
        // Generic unauth → go sign up
        router.push(`/signup?next=${encodeURIComponent(next)}`);
        return;
      }

      if (!res.ok || data?.error) {
        setError(data?.error || `Failed to accept invite (HTTP ${res.status}).`);
        if (data?.detail) setDetail(String(data.detail));
        setBusy(false);
        return;
      }

      setOkMsg("Invite accepted! Redirecting to your dashboard…");
      setTimeout(() => router.replace("/dashboard"), 600);
    } catch (e: any) {
      setError(e?.message || "Unexpected error.");
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <div className="mb-8 flex flex-wrap gap-3">
        <Link href="/" className="rounded-full border px-4 py-2">
          Home
        </Link>
        <Link href="/login" className="rounded-full border px-4 py-2">
          Login (soon)
        </Link>
        <Link href="/dashboard" className="rounded-full border px-4 py-2">
          Dashboard (soon)
        </Link>
      </div>

      <h1 className="mb-6 text-4xl font-bold">League invite</h1>

      <div className="mb-6 rounded-2xl border bg-black/20 p-5">
        <div className="mb-1 text-sm text-neutral-400">Invite token</div>
        <div className="break-all font-mono text-neutral-200">{token}</div>
      </div>

      {authed ? (
        <div className="mb-6">
          <label htmlFor="teamName" className="mb-2 block text-sm text-neutral-300">
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
          className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {busy ? "Accepting…" : "Accept invite"}
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-neutral-600 px-5 py-2 hover:bg-neutral-800"
        >
          Decline
        </Link>
      </div>

      {error && (
        <div className="mt-6 text-red-400">
          <div className="font-semibold">Error</div>
          <div className="text-sm">{error}</div>
          {detail && <div className="mt-1 text-xs opacity-80">{detail}</div>}
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
