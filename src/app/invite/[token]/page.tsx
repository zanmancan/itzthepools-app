// src/app/invite/[token]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type InviteContext =
  | {
      ok: true;
      leagueId: string;
      leagueName: string;
      token: string;
      expiresAt: number;
      consumedAt: number | null;
    }
  | { ok: false; code: "NOT_FOUND" | "EXPIRED" | "USED"; message: string };

type AcceptInviteResponse =
  | { ok: true; membershipId: string; leagueId: string; teamName: string }
  | { ok: false; code: string; message: string };

type Props = { params: { token: string } };

function validateTeamName(name: string) {
  const n = name.trim();
  if (n.length < 2) return "Team name must be at least 2 characters.";
  if (n.length > 30) return "Team name must be 30 characters or fewer.";
  if (!/^[A-Za-z0-9 _-]+$/.test(n))
    return "Only letters, numbers, spaces, dashes and underscores are allowed.";
  return null;
}

export default function Page({ params }: Props) {
  const { token } = params;
  const [ctx, setCtx] = useState<InviteContext | null>(null);
  const [team, setTeam] = useState("");
  const [teamError, setTeamError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Load invite context
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/invites/context?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as InviteContext;
        if (active) {
          setCtx(json);
          // If API returned an error object, surface it as a toast (what the spec expects)
          if (!json.ok) setToast(json.message || "Invite unavailable");
        }
      } catch {
        if (active) {
          const err = {
            ok: false as const,
            code: "NOT_FOUND" as const,
            message: "Failed to load invite",
          };
          setCtx(err);
          setToast(err.message);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  // Live-validate team
  useEffect(() => {
    setTeamError(validateTeamName(team));
  }, [team]);

  const expiresStr = useMemo(() => {
    if (!ctx || !ctx.ok) return "";
    return new Date(ctx.expiresAt).toLocaleString();
  }, [ctx]);

  async function onAccept() {
    setToast(null);
    if (!ctx || !ctx.ok) return;
    const err = validateTeamName(team);
    if (err) {
      setTeamError(err);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: ctx.token, teamName: team }),
      });
      const json = (await res.json()) as AcceptInviteResponse;
      if (!res.ok || !("ok" in json) || json.ok !== true) {
        setToast((json as any)?.message ?? "Failed to accept invite");
        setBusy(false);
        return;
      }
      // E2E expects /leagues/:id (plural)
      window.location.href = `/leagues/${json.leagueId}`;
    } catch {
      setToast("Network error. Please try again.");
      setBusy(false);
    }
  }

  // Loading state
  if (!ctx) {
    return (
      <main className="max-w-xl mx-auto p-6 space-y-4">
        <div
          data-testid="pending-invite-banner"
          className="rounded-lg border p-4 bg-amber-50"
        >
          <p className="text-sm">
            You’re viewing an invite. Enter a team name to join.
          </p>
        </div>
        <p>Loading…</p>
      </main>
    );
  }

  // Error states (EXPIRED / USED / NOT_FOUND) — show banner + toast
  if (!ctx.ok) {
    return (
      <main className="max-w-xl mx-auto p-6 space-y-4">
        <div
          data-testid="pending-invite-banner"
          className="rounded-lg border p-4 bg-amber-50"
        >
          <p className="text-sm">
            This invite could not be used. You can return to your dashboard.
          </p>
        </div>

        {/* Toast required by the test: either [data-testid="toast"] or [role="status"] */}
        <div
          data-testid="toast"
          role="status"
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {toast ?? ctx.message}
        </div>

        <h1 className="text-xl font-semibold">Invite</h1>
        <p className="text-sm text-gray-700">{ctx.message}</p>
        <p>
          <Link className="underline" href="/dashboard">
            Back to Dashboard
          </Link>
        </p>
      </main>
    );
  }

  // Happy path
  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <div
        data-testid="pending-invite-banner"
        className="rounded-lg border p-4 bg-amber-50"
      >
        <p className="text-sm">
          This invite will add you to the league once you submit a valid team
          name.
        </p>
      </div>

      {/* Spec asserts the league name using this id */}
      <h1 data-testid="invite-league-name" className="text-xl font-semibold">
        Join — {ctx.leagueName}
      </h1>
      <p className="text-sm text-gray-600">Expires: {expiresStr}</p>

      <label className="block space-y-1">
        <span className="text-sm">Team name</span>
        <input
          name="teamName"
          data-testid="team-name-input"
          className="w-full rounded border px-3 py-2"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          placeholder="Enter your team name"
        />
        {teamError && (
          <span className="text-xs text-red-600">{teamError}</span>
        )}
      </label>

      <button
        data-testid="accept-invite"
        className="rounded px-4 py-2 border"
        disabled={busy || !!teamError}
        onClick={onAccept}
      >
        {busy ? "Accepting…" : "Accept invite"}
      </button>

      {toast && (
        <div
          data-testid="toast"
          role="status"
          className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
