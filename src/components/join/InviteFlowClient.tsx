"use client";

import React from "react";

type InviteDTO = {
  id: string;
  token: string;
  league_id: string;
  email: string | null;
  is_public: boolean | null;
  accepted: boolean | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type LeagueDTO = {
  id: string;
  name: string;
  season: string;
};

type WhoAmI = { user?: { id: string; email?: string | null } };

type Props = {
  token: string;
};

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(+d)) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function InviteFlowClient({ token }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [invite, setInvite] = React.useState<InviteDTO | null>(null);
  const [league, setLeague] = React.useState<LeagueDTO | null>(null);

  const [me, setMe] = React.useState<WhoAmI["user"] | null>(null);

  // auth form state
  const [mode, setMode] = React.useState<"signin" | "signup">("signup");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authMsg, setAuthMsg] = React.useState<string | null>(null);

  // team name state (visible only when signed in)
  const [teamName, setTeamName] = React.useState("");
  const [checkingName, setCheckingName] = React.useState(false);
  const [nameAvailable, setNameAvailable] = React.useState<boolean | null>(null);
  const [acceptBusy, setAcceptBusy] = React.useState(false);
  const [acceptMsg, setAcceptMsg] = React.useState<string | null>(null);

  // ----- helpers -------------------------------------------------------------

  const loadWhoAmI = React.useCallback(async () => {
    try {
      const r = await fetch("/api/auth/whoami", { credentials: "include" });
      const j: WhoAmI = await r.json();
      setMe(j?.user ?? null);
    } catch {
      setMe(null);
    }
  }, []);

  const loadInvite = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/invites/token/${encodeURIComponent(token)}`, {
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok || j?.error) {
        setError(j?.error || `Not found`);
        setInvite(null);
        setLeague(null);
      } else {
        setInvite(j.invite as InviteDTO);
        setLeague(j.league as LeagueDTO);
      }
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadInvite();
    loadWhoAmI();
  }, [loadInvite, loadWhoAmI]);

  // store pending invite before starting any auth flow
  const rememberPending = React.useCallback(() => {
    try {
      localStorage.setItem(
        "pending_invite",
        JSON.stringify({ token, variant: "invite" as const })
      );
    } catch {}
  }, [token]);

  // team name live check (debounced)
  React.useEffect(() => {
    if (!league || !teamName.trim()) {
      setNameAvailable(null);
      return;
    }
    const q = teamName.trim();
    const id = setTimeout(async () => {
      setCheckingName(true);
      try {
        // If you kept a different endpoint, adjust the URL here:
        const url = `/api/leagues/team-name-check?leagueId=${encodeURIComponent(
          league.id
        )}&name=${encodeURIComponent(q)}`;
        const r = await fetch(url, { credentials: "include" });
        const j = await r.json();
        if (r.ok) {
          setNameAvailable(!!j.available);
        } else {
          setNameAvailable(null);
        }
      } catch {
        setNameAvailable(null);
      } finally {
        setCheckingName(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [league, teamName]);

  // ----- actions -------------------------------------------------------------

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setAuthBusy(true);
    setAuthMsg(null);
    setError(null);
    rememberPending();

    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = await r.json();
      if (!r.ok || j?.error) {
        setAuthMsg(j?.error || `Create failed (HTTP ${r.status})`);
        return;
      }
      // Most setups send a magic link. Tell the user to check email.
      setAuthMsg("Check your email to confirm your account.");
    } catch (e: any) {
      setAuthMsg(e?.message || "Network error.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function onSignin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setAuthBusy(true);
    setAuthMsg(null);
    setError(null);
    rememberPending();

    try {
      const r = await fetch("/api/auth/signin", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = await r.json();
      if (!r.ok || j?.error) {
        setAuthMsg(j?.error || `Sign in failed (HTTP ${r.status})`);
        return;
      }
      await loadWhoAmI();
      setAuthMsg(null);
    } catch (e: any) {
      setAuthMsg(e?.message || "Network error.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function onAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite || !teamName.trim()) return;

    setAcceptBusy(true);
    setAcceptMsg(null);
    setError(null);

    try {
      const r = await fetch("/api/invites/accept-with-name", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p_token: invite.token,
          p_team_name: teamName.trim(),
        }),
      });
      const j = await r.json();
      if (!r.ok || j?.error) {
        setAcceptMsg(j?.error || `Failed (HTTP ${r.status})`);
        return;
      }
      setAcceptMsg("Success! You’ve joined the league.");
      // send them to dashboard after a beat
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    } catch (e: any) {
      setAcceptMsg(e?.message || "Network error.");
    } finally {
      setAcceptBusy(false);
    }
  }

  function copyLink() {
    const base = window.location.origin;
    const url = `${base}/join/invite?token=${encodeURIComponent(token)}`;
    navigator.clipboard
      .writeText(url)
      .catch(() => setError("Copy failed. You can copy the link manually."));
  }

  // ----- render --------------------------------------------------------------

  if (loading) {
    return (
      <div className="rounded-md border border-gray-800 bg-gray-900/40 p-4 text-sm text-gray-300">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!invite || !league) {
    return (
      <div className="rounded-md border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
        Not found.
      </div>
    );
  }

  const expired =
    invite.expires_at &&
    !Number.isNaN(+new Date(invite.expires_at)) &&
    new Date(invite.expires_at).getTime() < Date.now();

  const disabledAccept =
    !me ||
    !teamName.trim() ||
    checkingName ||
    nameAvailable === false ||
    acceptBusy;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
      <div className="mb-3 text-lg font-semibold">Join League</div>

      <div className="mb-3 rounded-md border border-gray-800 bg-gray-900/40 p-3 text-sm text-gray-200">
        <div className="mb-1">
          <span className="font-medium">Type:</span>{" "}
          {invite.is_public ? "Public link" : "Email invite"}
        </div>
        {!invite.is_public && (
          <div className="mb-1">
            <span className="font-medium">Sent to:</span>{" "}
            {invite.email || "—"}
          </div>
        )}
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={copyLink}
            type="button"
            className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
          >
            Copy link
          </button>
          <div className="text-gray-400">
            Expires: {fmtDateTime(invite.expires_at)}
          </div>
        </div>
        {expired && (
          <div className="rounded-md border border-red-800 bg-red-900/30 px-2 py-1 text-xs text-red-300">
            This invite has expired.
          </div>
        )}
      </div>

      {/* AUTH AREA — hidden once a session exists */}
      {!me && (
        <div className="mb-4 rounded-md border border-gray-800 bg-gray-900/40 p-3">
          <div className="mb-2 text-sm font-medium text-gray-200">
            {mode === "signup" ? "Create account" : "Sign in"}
          </div>

          {mode === "signup" ? (
            <form onSubmit={onSignup} className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={authBusy}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {authBusy ? "Working…" : "Create account"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setAuthMsg(null);
                  }}
                  className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/40"
                >
                  I already have an account
                </button>
              </div>
              {authMsg && (
                <div className="rounded-md border border-gray-700 bg-gray-800/40 px-3 py-2 text-xs text-gray-300">
                  {authMsg}
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={onSignin} className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={authBusy}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {authBusy ? "Working…" : "Sign in"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setAuthMsg(null);
                  }}
                  className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/40"
                >
                  Create account instead
                </button>
              </div>
              {authMsg && (
                <div className="rounded-md border border-gray-700 bg-gray-800/40 px-3 py-2 text-xs text-gray-300">
                  {authMsg}
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* TEAM + ACCEPT — only when signed in */}
      {me && (
        <form onSubmit={onAccept} className="rounded-md border border-gray-800 bg-gray-900/40 p-3">
          <div className="mb-2 text-sm font-medium text-gray-200">Team name</div>
          <input
            type="text"
            placeholder="Your team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="mb-2 w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
          />
          {teamName.trim() && (
            <div className="mb-2 text-xs">
              {checkingName && <span className="text-gray-400">Checking…</span>}
              {!checkingName && nameAvailable === true && (
                <span className="text-green-400">Available</span>
              )}
              {!checkingName && nameAvailable === false && (
                <span className="text-red-400">Name already taken in this league.</span>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={disabledAccept}
            className={`w-full rounded-md px-3 py-2 text-sm ${
              disabledAccept
                ? "cursor-not-allowed bg-green-700/40 text-green-100/70"
                : "bg-green-700 text-white hover:bg-green-600"
            }`}
          >
            {acceptBusy ? "Accepting…" : "Accept invite"}
          </button>

          {acceptMsg && (
            <div className="mt-2 rounded-md border border-gray-700 bg-gray-800/40 px-3 py-2 text-xs text-gray-300">
              {acceptMsg}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
