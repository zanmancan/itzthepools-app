// src/components/join/InviteFlowClient.tsx
"use client";

import * as React from "react";
import Link from "next/link";

type InviteMeta = {
  id: string;
  league_id: string;
  email: string | null;
  is_public: boolean | null;
  token: string | null;
  created_at: string;
  expires_at: string | null;
};

type Step = "invite" | "auth" | "verify" | "accept" | "done";

export default function InviteFlowClient({ token }: { token: string }) {
  // invite meta
  const [loading, setLoading] = React.useState(true);
  const [meta, setMeta] = React.useState<InviteMeta | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // step state
  const [step, setStep] = React.useState<Step>("invite");
  const [mode, setMode] = React.useState<"signin" | "signup">("signup");

  // auth fields
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authBusy, setAuthBusy] = React.useState(false);

  // verify fields (signup only)
  const [code, setCode] = React.useState("");
  const [verifyBusy, setVerifyBusy] = React.useState(false);

  // accept fields
  const [teamName, setTeamName] = React.useState("");
  const [acceptBusy, setAcceptBusy] = React.useState(false);
  const [acceptedLeagueId, setAcceptedLeagueId] = React.useState<string | null>(null);

  // UX for "Copied!"
  const [copied, setCopied] = React.useState(false);

  // load invite metadata
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/invites/token/${encodeURIComponent(token)}`, { credentials: "include" });
        const j = await res.json();
        if (!res.ok || j?.error) {
          if (!alive) return;
          setError(j?.error || `Failed to load invite (HTTP ${res.status})`);
          setMeta(null);
          setStep("invite");
        } else {
          if (!alive) return;
          setMeta(j.invite as InviteMeta);
          setStep("auth");
          // If the invite was addressed to an email, prefill:
          if (j?.invite?.email) setEmail(j.invite.email);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Network error loading invite.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  // check if already signed in -> skip auth/verify
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/whoami", { credentials: "include" });
        if (res.ok) {
          setStep("accept");
        }
      } catch {}
    })();
  }, []);

  function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => setError("Copy failed.")
    );
  }

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAuthBusy(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) {
        setError(j?.error || `Sign in failed (HTTP ${res.status})`);
        return;
      }
      // signed in -> go straight to accept
      setStep("accept");
    } catch (e: any) {
      setError(e?.message || "Network error during sign in.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAuthBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) {
        setError(j?.error || `Sign up failed (HTTP ${res.status})`);
        return;
      }
      // send/confirm code next
      setStep("verify");
    } catch (e: any) {
      setError(e?.message || "Network error during sign up.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function resendCode() {
    setError(null);
    try {
      const res = await fetch("/api/auth/resend", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) {
        setError(j?.error || `Could not resend code (HTTP ${res.status})`);
      }
    } catch (e: any) {
      setError(e?.message || "Network error requesting code.");
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifyBusy(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code, mode: "signup" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) {
        setError(j?.error || `Verification failed (HTTP ${res.status})`);
        return;
      }
      setStep("accept");
    } catch (e: any) {
      setError(e?.message || "Network error verifying code.");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function onAccept(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAcceptBusy(true);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, teamName }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) {
        setError(j?.error || `Accept failed (HTTP ${res.status})`);
        return;
      }
      setAcceptedLeagueId(String(j.league_id || ""));
      setStep("done");
    } catch (e: any) {
      setError(e?.message || "Network error accepting invite.");
    } finally {
      setAcceptBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-xl border border-gray-800 bg-gray-950/40 p-5">
      <h1 className="mb-3 text-xl font-semibold">Join League</h1>

      {/* invite details */}
      {(loading || meta) && (
        <div className="mb-4 rounded-md border border-gray-800 bg-black/25 p-3 text-sm text-gray-300">
          {loading ? "Loading invite…" : (
            <>
              <div>Type: {meta?.is_public ? "Public link" : "Email invite"}</div>
              <div>Sent to: {meta?.email || "—"}</div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${copied ? "bg-green-700 text-white" : "bg-gray-700 hover:bg-gray-600"}`}
                  onClick={copyLink}
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
                {meta?.expires_at && <span className="text-gray-400">Expires: {new Date(meta.expires_at).toLocaleString()}</span>}
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* step: auth (sign in OR sign up) */}
      {step === "auth" && (
        <div className="space-y-3">
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded px-3 py-1 ${mode === "signin" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded px-3 py-1 ${mode === "signup" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={mode === "signin" ? onSignIn : onSignUp} className="space-y-2">
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-500"
            />
            <button
              type="submit"
              disabled={authBusy}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {authBusy ? (mode === "signin" ? "Signing in…" : "Creating account…") : (mode === "signin" ? "Sign in" : "Create account")}
            </button>
          </form>
        </div>
      )}

      {/* step: verify (signup only) */}
      {step === "verify" && (
        <form onSubmit={onVerify} className="space-y-3">
          <p className="text-sm text-gray-300">
            We sent a 6-digit code to <span className="font-medium">{email}</span>. Enter it below to verify your email.
          </p>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={verifyBusy}
              className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-500 disabled:opacity-60"
            >
              {verifyBusy ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={resendCode}
              className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/40"
            >
              Resend code
            </button>
          </div>
        </form>
      )}

      {/* step: accept (team name + accept) */}
      {step === "accept" && (
        <form onSubmit={onAccept} className="space-y-3">
          <label className="block text-sm text-gray-300">
            Team name
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Your team name"
              className="mt-1 w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-500"
            />
          </label>
          <button
            type="submit"
            disabled={acceptBusy || !teamName.trim()}
            className="w-full rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-500 disabled:opacity-60"
          >
            {acceptBusy ? "Accepting…" : "Accept invite"}
          </button>
        </form>
      )}

      {/* step: done */}
      {step === "done" && (
        <div className="space-y-3">
          <p className="text-sm text-green-300">Success! You’ve joined the league.</p>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/40"
            >
              Go to Dashboard
            </Link>
            {acceptedLeagueId && (
              <Link
                href={`/league/${acceptedLeagueId}`}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
              >
                Open League
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
