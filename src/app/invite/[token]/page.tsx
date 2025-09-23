// src/app/invite/[token]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatLocal } from "@/lib/time";
import type { InviteContext, AcceptInviteResponse } from "@/lib/invites/types";

type Props = { params: { token: string } };

function validateTeamName(name: string) {
  const n = name.trim();
  if (n.length < 2) return "Team name must be at least 2 characters.";
  if (n.length > 30) return "Team name must be 30 characters or fewer.";
  if (!/^[A-Za-z0-9 _-]+$/.test(n)) return "Only letters, numbers, spaces, dashes and underscores are allowed.";
  return null;
}

export default function InvitePage({ params }: Props) {
  const token = params.token;

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const [teamName, setTeamName] = useState("");
  const [leagueName, setLeagueName] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<number>(0);

  const [ctxLoading, setCtxLoading] = useState(true);
  const [ctxError, setCtxError] = useState<string>("");

  const teamError = useMemo(() => validateTeamName(teamName), [teamName]);

  // Cache/restore team name (nice UX, not required by tests)
  useEffect(() => {
    const cached = localStorage.getItem(`invite-teamname:${token}`);
    if (cached) setTeamName(cached);
  }, [token]);

  // Load invite context; show error for expired/used
  useEffect(() => {
    let mounted = true;
    (async () => {
      setCtxLoading(true);
      setCtxError("");
      try {
        const res = await fetch(`/api/invites/context?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data: InviteContext = await res.json();
        if (!mounted) return;
        if (!res.ok || !data?.ok) {
          setCtxError((data as any)?.code ?? `Error ${res.status}`);
        } else {
          setLeagueName(data.leagueName);
          setExpiresAt(data.expiresAt);
        }
      } catch (e: any) {
        if (mounted) setCtxError(e?.message ?? "Network error");
      } finally {
        if (mounted) setCtxLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  function onTeamChange(v: string) {
    setTeamName(v);
    try { localStorage.setItem(`invite-teamname:${token}`, v); } catch {}
  }

  async function onAccept() {
    setBusy(true);
    setToast("");

    try {
      if (teamError) {
        setToast(teamError);
        setBusy(false);
        return;
      }

      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token, teamName }),
      });
      const data: AcceptInviteResponse = await res.json();

      if (!res.ok || !data?.ok) {
        setToast(`${(data as any)?.code ?? res.status}: ${(data as any)?.message ?? "Failed"}`);
        setBusy(false);
        return;
      }

      try { localStorage.removeItem(`invite-teamname:${token}`); } catch {}
      // E2E asserts this target
      window.location.href = `/leagues/${data.leagueId}`;
    } catch (e: any) {
      setToast(e?.message ?? "Unexpected error");
      setBusy(false);
    }
  }

  if (ctxLoading) return <main className="p-6 max-w-xl mx-auto">Loading invite…</main>;

  // Error state (expired/used/etc)
  if (ctxError) {
    return (
      <main className="p-6 max-w-xl mx-auto space-y-3">
        <div data-testid="pending-invite-banner" className="rounded border p-3 bg-yellow-50">
          Invite error
        </div>
        <div data-testid="toast" role="status" className="text-red-600">{ctxError}</div>
        <Link className="underline" href="/dashboard">Go to dashboard</Link>
      </main>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6 space-y-4">
      <div data-testid="pending-invite-banner" className="rounded-md border p-3">
        You have a pending invite.
      </div>

      <h1 className="text-2xl font-semibold">
        Join <span data-testid="invite-league-name">{leagueName}</span>
      </h1>

      {expiresAt > 0 && <p className="text-sm opacity-70">Expires {formatLocal(expiresAt)}</p>}

      <label htmlFor="teamName" className="block text-sm">Team name</label>
      <input
        id="teamName"
        name="teamName"
        data-testid="team-name-input"
        className="border rounded px-3 py-2 w-full"
        value={teamName}
        onChange={(e) => onTeamChange(e.target.value)}
        placeholder="Your team name"
        autoComplete="off"
        maxLength={30}
      />

      <button
        data-testid="accept-invite"
        className="rounded px-4 py-2 border"
        disabled={busy || !!teamError}
        onClick={onAccept}
      >
        {busy ? "Accepting…" : "Accept invite"}
      </button>

      {toast && <div data-testid="toast" role="status" className="mt-3 text-sm text-red-600">{toast}</div>}
    </div>
  );
}
