// src/app/join/[token]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";
import { savePendingInvite, clearPendingInvite } from "@/lib/pendingInvite";

export default function JoinPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const { addToast } = useToast();

  // auth state
  const [authed, setAuthed] = useState<boolean | null>(null);

  // invite meta
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [league, setLeague] = useState<{
    id: string;
    name: string;
    ruleset: string;
    season: string;
  } | null>(null);

  // email login state (magic link)
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);

  // team-name accept state
  const [teamName, setTeamName] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [acceptErr, setAcceptErr] = useState<string | null>(null);
  const [checkSeq, setCheckSeq] = useState(0);

  // keep the token handy across redirects
  useEffect(() => {
    savePendingInvite(token);
  }, [token]);

  // who am I?
  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthed(!!user);
    })();
  }, []);

  // pull invite -> league meta (and whether token is already used)
  useEffect(() => {
    void (async () => {
      setLoadingInvite(true);
      setInviteErr(null);
      try {
        const res = await fetch(`/api/invites/${token}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (data.status === "used") {
          setInviteErr("This invite link has already been used.");
          setLeague(null);
        } else {
          setLeague({
            id: data.leagueId,
            name: data.leagueName,
            ruleset: data.ruleset,
            season: data.season,
          });
        }
      } catch (e: any) {
        setInviteErr(e?.message ?? "Failed to load invite");
      } finally {
        setLoadingInvite(false);
      }
    })();
  }, [token]);

  const cleanName = useMemo(
    () => teamName.trim().replace(/\s+/g, " "),
    [teamName]
  );

  // live team-name availability (when authed & we know the league)
  useEffect(() => {
    if (!authed || !league) return;

    if (!cleanName) {
      setAvailable(null);
      setChecking(false);
      return;
    }

    const my = checkSeq + 1;
    setCheckSeq(my);
    setChecking(true);

    const t = setTimeout(() => {
      void (async () => {
        try {
          const { data, error } = await supabase.rpc("is_team_name_available", {
            p_league_id: league.id,
            p_name: cleanName,
          });
          // stale check guard
          if (my !== checkSeq + 1) return;
          if (error) setAvailable(null);
          else setAvailable(!!data);
        } finally {
          setChecking(false);
        }
      })();
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanName, authed, league]);

  async function sendMagicLink() {
    setSendErr(null);
    const returnTo = `/join/${token}`; // come back here
    const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(
      returnTo
    )}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) setSendErr(error.message);
    else setSent(true);
  }

  async function acceptInvite() {
    if (!league) return;
    if (!cleanName) {
      setAcceptErr("Team name is required.");
      return;
    }
    if (available === false) {
      setAcceptErr("That team name is taken.");
      return;
    }

    setAcceptBusy(true);
    setAcceptErr(null);
    try {
      const res = await fetch("/api/invites/accept-with-name", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, teamName: cleanName }),
      });
      if (!res.ok) throw new Error(await res.text());
      addToast("Joined league!", "success");
      clearPendingInvite();
      // redirect to plural path
      window.location.href = `/leagues/${league.id}`;
    } catch (e: any) {
      setAcceptErr(e?.message ?? "Failed to accept invite");
      addToast("Failed to accept invite", "error");
    } finally {
      setAcceptBusy(false);
    }
  }

  // ---- UI ----

  if (loadingInvite || authed === null) {
    return (
      <div className="card max-w-lg">
        <div className="h1 mb-2">Join League</div>
        <p className="opacity-75">Loading…</p>
      </div>
    );
  }

  if (inviteErr) {
    return (
      <div className="card max-w-lg">
        <div className="h1 mb-2">Join League</div>
        <p className="text-red-400">{inviteErr}</p>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="card max-w-lg">
        <div className="h1 mb-2">Join League</div>
        <p className="opacity-75">Invite not found.</p>
      </div>
    );
  }

  // Not logged in → email box for magic link
  if (!authed) {
    return (
      <div className="card max-w-lg">
        <div className="h1 mb-2">Join “{league.name}”</div>
        <p className="opacity-80 text-sm">
          Enter your email to sign in or create a new account. We’ll return you
          here to accept the invite.
        </p>

        {sent ? (
          <p className="mt-3">Check your email for the magic link.</p>
        ) : (
          <>
            <input
              className="input mt-3"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              className="btn mt-3"
              onClick={() => {
                void sendMagicLink();
              }}
            >
              Send magic link
            </button>
            {sendErr && <p className="mt-2 text-red-400">{sendErr}</p>}
          </>
        )}
      </div>
    );
  }

  // Logged in → accept with team name
  return (
    <div className="card max-w-lg">
      <div className="h1 mb-2">Join “{league.name}”</div>
      <div className="opacity-70 mb-4">
        {league.ruleset} — {league.season}
      </div>

      <label className="block mb-2">
        <div className="mb-1 opacity-70">Team Name (required)</div>
        <input
          className="input"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Zandy Family Bracket"
        />
      </label>

      <div className="text-sm mb-3">
        {!cleanName ? (
          <span className="opacity-70">Enter a team name</span>
        ) : checking ? (
          <span className="opacity-70">Checking…</span>
        ) : available === false ? (
          <span className="text-red-400">That team name is taken.</span>
        ) : available === true ? (
          <span className="text-green-400">Looks good.</span>
        ) : (
          <span className="opacity-70"> </span>
        )}
      </div>

      <button
        className="btn"
        onClick={() => {
          void acceptInvite();
        }}
        disabled={acceptBusy || !cleanName || available === false}
      >
        {acceptBusy ? "Joining…" : "Accept Invite"}
      </button>
      {acceptErr && <p className="text-red-400 mt-2">{acceptErr}</p>}
    </div>
  );
}
