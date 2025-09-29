"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InviteCtx =
  | { ok: false; error: string }
  | { ok: true; token: string; leagueId: string; leagueName: string; email: string };

export default function InviteAcceptPage(props: { params: { token: string } }) {
  const router = useRouter();
  const token = props.params.token;

  const [ctx, setCtx] = useState<InviteCtx | null>(null);
  const [team, setTeam] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function showToast(t: string) {
    setToast(t);
    setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/test/invites/by-token/${token}`, { cache: "no-store" });
      const json = (await res.json()) as InviteCtx;
      if (alive) setCtx(json);
    })();
    return () => { alive = false; };
  }, [token]);

  async function accept() {
    if (!team.trim()) {
      showToast("Enter a team name.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/test/invites/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, teamName: team }),
      });
      const json = await res.json();
      if (!json.ok) {
        // reflect duplicate or other errors
        showToast(String(json.error || "Could not accept invite."));
        return;
      }
      // Navigate to league page; spec expects to see the league header
      router.push(`/leagues/${json.leagueId}`);
    } catch (e: any) {
      showToast(e?.message || "Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      {toast && (
        <div
          role="alert"
          data-testid="toast"
          className="rounded-md border border-red-700 bg-red-950/60 px-3 py-2 text-sm text-red-200"
        >
          {toast}
        </div>
      )}

      {ctx === null && <div className="text-slate-400">Loading…</div>}

      {ctx && !ctx.ok && (
        <div
          role="alert"
          className="rounded-md border border-red-700 bg-red-950/60 px-3 py-2 text-sm text-red-200"
        >
          Invite not found or expired
        </div>
      )}

      {ctx && ctx.ok && (
        <>
          <div
            data-testid="pending-invite-banner"
            className="rounded-md border border-amber-700 bg-amber-900/40 px-3 py-2 text-amber-100"
          >
            You’ve been invited to join{" "}
            <strong data-testid="invite-league-name">{ctx.leagueName}</strong>.
            Enter your team name to accept.
          </div>

          <label className="block text-sm">
            Team name
            <input
              data-testid="team-name-input"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2"
              placeholder="My Team"
              value={team}
              onChange={(e) => setTeam(e.currentTarget.value)}
            />
          </label>

          <button
            data-testid="accept-invite"
            onClick={accept}
            disabled={busy}
            className="rounded-xl border border-sky-700 bg-sky-800/50 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-800/70 disabled:opacity-60"
          >
            {busy ? "Accepting…" : "Accept invite"}
          </button>
        </>
      )}
    </main>
  );
}
