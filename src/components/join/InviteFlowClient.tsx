"use client";

import React from "react";

/**
 * Props:
 *  - token: invite/public token from the URL
 */
export default function InviteFlowClient({ token }: { token: string }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Invite/league we loaded from the server token endpoint
  const [invite, setInvite] = React.useState<{
    invite: {
      id: string;
      league_id: string;
      email: string | null;
      is_public: boolean;
      accepted: boolean;
      expires_at: string | null;
      created_at: string | null;
    };
    league: { id: string; name: string; season: string };
  } | null>(null);

  // auth state: we let the existing server guard handle redirect to /login when needed.
  // Here we just show forms and call APIs.
  const [mode, setMode] = React.useState<"choose" | "create" | "signin" | "verify" | "accept">(
    "choose"
  );

  // inline team-name + availability
  const [teamName, setTeamName] = React.useState("");
  const [nameBusy, setNameBusy] = React.useState(false);
  const [nameOK, setNameOK] = React.useState<boolean | null>(null); // null = untouched, true=free, false=taken
  const [acceptBusy, setAcceptBusy] = React.useState(false);
  const [acceptMsg, setAcceptMsg] = React.useState<string | null>(null);

  // For create/sign-in flow (we keep it minimal here; your /api/auth/* routes already exist)
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authMsg, setAuthMsg] = React.useState<string | null>(null);

  // Load token details
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/invites/token/${encodeURIComponent(token)}`, {
          credentials: "include",
        });
        const j = await res.json();
        if (!res.ok || j?.error) {
          setError(j?.error || `HTTP ${res.status}`);
          setInvite(null);
        } else {
          setInvite({ invite: j.invite, league: j.league });
          setMode("choose");
        }
      } catch (e: any) {
        setError(e?.message || "Network error.");
        setInvite(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Debounced name availability check
  React.useEffect(() => {
    if (!invite?.league?.id) return;
    const name = teamName.trim();
    if (!name) {
      setNameOK(null);
      return;
    }
    if (name.length < 2 || name.length > 32) {
      setNameOK(false);
      return;
    }

    const t = setTimeout(async () => {
      setNameBusy(true);
      try {
        const res = await fetch(
          `/api/leagues/${invite.league.id}/team-name-check?name=${encodeURIComponent(name)}`,
          { credentials: "include" }
        );
        const j = await res.json();
        if (!res.ok || j?.error) {
          setNameOK(false);
        } else {
          setNameOK(!!j.available);
        }
      } catch {
        setNameOK(false);
      } finally {
        setNameBusy(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [teamName, invite?.league?.id]);

  async function doCreate() {
    setAuthBusy(true);
    setAuthMsg(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = await res.json();
      if (!res.ok || j?.error) setAuthMsg(j?.error || `HTTP ${res.status}`);
      else setAuthMsg("Check your email for the confirmation code.");
    } catch (e: any) {
      setAuthMsg(e?.message || "Network error.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function doSignin() {
    setAuthBusy(true);
    setAuthMsg(null);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = await res.json();
      if (!res.ok || j?.error) setAuthMsg(j?.error || `HTTP ${res.status}`);
      else setMode("accept");
    } catch (e: any) {
      setAuthMsg(e?.message || "Network error.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function doAccept() {
    if (!invite?.league?.id) return;
    setAcceptBusy(true);
    setAcceptMsg(null);
    try {
      const res = await fetch("/api/invites/accept-with-name", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, team_name: teamName.trim() }),
      });
      const j = await res.json();
      if (!res.ok || j?.error) {
        setAcceptMsg(j?.error || `HTTP ${res.status}`);
      } else {
        setAcceptMsg("Success! You’ve joined the league.");
      }
    } catch (e: any) {
      setAcceptMsg(e?.message || "Network error.");
    } finally {
      setAcceptBusy(false);
    }
  }

  // UI
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Join League</h1>

      {loading && <div className="text-gray-300">Loading…</div>}

      {!loading && error && (
        <div className="rounded-md border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && invite && (
        <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
          <div className="mb-3 text-sm text-gray-400">
            <div className="font-medium text-gray-200">Type: {invite.invite.is_public ? "Public link" : "Email invite"}</div>
            {!invite.invite.is_public && invite.invite.email && (
              <div>Sent to: {invite.invite.email}</div>
            )}
            {invite.invite.expires_at && (
              <div>Expires: {new Date(invite.invite.expires_at).toLocaleString()}</div>
            )}
          </div>

          {/* Choose sign in / create account */}
          {mode === "choose" && (
            <div className="flex gap-2">
              <button
                onClick={() => setMode("signin")}
                className="rounded bg-gray-800 px-3 py-2 text-sm text-gray-100 hover:bg-gray-700"
              >
                Sign in
              </button>
              <button
                onClick={() => setMode("create")}
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
              >
                Create account
              </button>
            </div>
          )}

          {(mode === "create" || mode === "signin") && (
            <div className="mt-3 rounded-md border border-gray-800 bg-gray-900/40 p-3">
              <div className="mb-2 text-sm text-gray-300">{mode === "create" ? "Create account" : "Sign in"}</div>
              {authMsg && (
                <div className="mb-2 rounded border border-gray-700 bg-gray-800/60 px-2 py-1 text-sm text-gray-200">
                  {authMsg}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100"
                />
                <input
                  type="password"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100"
                />
                <div className="flex gap-2">
                  {mode === "signin" ? (
                    <button
                      onClick={doSignin}
                      disabled={authBusy}
                      className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-60"
                    >
                      {authBusy ? "Signing in…" : "Sign in"}
                    </button>
                  ) : (
                    <button
                      onClick={doCreate}
                      disabled={authBusy}
                      className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-60"
                    >
                      {authBusy ? "Creating…" : "Create account"}
                    </button>
                  )}
                  <button
                    onClick={() => setMode(mode === "signin" ? "create" : "signin")}
                    className="rounded border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/50"
                  >
                    {mode === "signin" ? "Create account instead" : "I already have an account"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Accept flow (team name + button) */}
          {mode !== "choose" && (
            <div className="mt-4 rounded-md border border-gray-800 bg-gray-900/40 p-3">
              <div className="mb-2 text-sm text-gray-300">Team name</div>
              <input
                type="text"
                placeholder="Your team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="mb-2 w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100"
              />

              {nameBusy && <div className="text-xs text-gray-400">Checking availability…</div>}
              {!nameBusy && nameOK === true && (
                <div className="text-xs text-green-400">Name available ✓</div>
              )}
              {!nameBusy && nameOK === false && (
                <div className="text-xs text-red-400">That name is taken in this league.</div>
              )}

              {acceptMsg && (
                <div className="mt-2 rounded border border-gray-700 bg-gray-800/60 px-2 py-1 text-sm text-gray-200">
                  {acceptMsg}
                </div>
              )}

              <div className="mt-3">
                <button
                  onClick={doAccept}
                  disabled={acceptBusy || !teamName || nameOK === false}
                  className="w-full rounded bg-green-700 px-3 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-60"
                >
                  {acceptBusy ? "Accepting…" : "Accept invite"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
