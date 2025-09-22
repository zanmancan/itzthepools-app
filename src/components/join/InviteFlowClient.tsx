"use client";

import React from "react";
import Link from "next/link";

type Props = {
  token: string;                 // invite/public token
  variant?: "invite" | "public"; // for small copy changes
};

// ----- helpers ---------------------------------------------------------------
async function postJSON(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json;
}
async function getJSON(url: string) {
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-gray-300">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

// ----- component -------------------------------------------------------------
export default function InviteFlowClient({ token, variant = "invite" }: Props) {
  type Step =
    | "checking"
    | "chooseAuth"
    | "signin"
    | "signup"
    | "verify"
    | "finalize"   // Enter Team Name AND Accept invite
    | "joining"
    | "done";

  const [step, setStep] = React.useState<Step>("checking");
  const [error, setError] = React.useState<string | null>(null);

  // auth fields
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  // finalize (team + accept)
  const [teamName, setTeamName] = React.useState("");
  const [resultMsg, setResultMsg] = React.useState<string | null>(null);

  // On mount: see if already signed-in
  React.useEffect(() => {
    (async () => {
      try {
        const who = await getJSON("/api/auth/whoami").catch(() => ({}));
        if (who?.user?.email) {
          setEmail(who.user.email);
          setStep("finalize");
        } else {
          setStep("chooseAuth");
        }
      } catch {
        setStep("chooseAuth");
      }
    })();
  }, []);

  // ---- actions --------------------------------------------------------------
  async function doSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await postJSON("/api/auth/signin", { email, password });
      setStep("finalize");
    } catch (e: any) {
      setError(e?.message || "Sign in failed");
    }
  }

  async function doSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await postJSON("/api/auth/signup", { email, password });
      setStep("verify");
    } catch (e: any) {
      setError(e?.message || "Sign up failed");
    }
  }

  async function doVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await postJSON("/api/auth/verify-code", { email, code });
      setStep("finalize");
    } catch (e: any) {
      setError(e?.message || "Verify failed");
    }
  }

  // The final, single action: enter team name AND accept invite
  async function doJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!teamName.trim()) {
      setError("Please enter a team name.");
      return;
    }
    setStep("joining");
    try {
      // If your route name differs, swap this URL/payload
      const res = await postJSON("/api/invites/accept-with-name", {
        p_token: token,
        p_team_name: teamName.trim(),
      });
      setResultMsg(res?.message || "Success! You’ve joined the league.");
      setStep("done");
    } catch (e: any) {
      setError(e?.message || "Join failed");
      setStep("finalize");
    }
  }

  // ---- UI -------------------------------------------------------------------
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-5">
      <div className="mb-4 text-sm text-gray-400">
        {variant === "public" ? "Public link invite" : "League invite"} • token{" "}
        <span className="opacity-60">{token.slice(0, 6)}…</span>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === "checking" && <p className="text-gray-300">Loading…</p>}

      {step === "chooseAuth" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
            onClick={() => setStep("signin")}
          >
            I already have an account
          </button>
          <button
            className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800/60"
            onClick={() => setStep("signup")}
          >
            I’m new — create account
          </button>
        </div>
      )}

      {step === "signin" && (
        <form onSubmit={doSignIn} className="flex flex-col gap-3">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
            />
          </Field>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setStep("signup")}
              className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800/60"
            >
              Create account instead
            </button>
          </div>
        </form>
      )}

      {step === "signup" && (
        <form onSubmit={doSignUp} className="flex flex-col gap-3">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
            />
          </Field>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => setStep("signin")}
              className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800/60"
            >
              I already have an account
            </button>
          </div>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={doVerify} className="flex flex-col gap-3">
          <p className="text-sm text-gray-300">
            We sent a verification code to <span className="font-medium">{email}</span>.
          </p>
          <Field label="Verification code">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-48 rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
            />
          </Field>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
            >
              Verify & continue
            </button>
          </div>
        </form>
      )}

      {/* FINALIZE: Team name AND accept in the same submit */}
      {step === "finalize" && (
        <form onSubmit={doJoin} className="flex flex-col gap-3">
          <p className="text-sm text-gray-300">
            Final step: choose your <span className="font-medium">Team Name</span> and join the league.
          </p>
          <Field label="Team name">
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Zandy United"
              className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-500"
            />
          </Field>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
            >
              Join league
            </button>
            <Link
              href="/dashboard"
              className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800/60"
            >
              Go to Dashboard
            </Link>
          </div>
        </form>
      )}

      {step === "joining" && <p className="text-gray-300">Joining…</p>}

      {step === "done" && (
        <div className="space-y-3">
          <div className="rounded-md border border-green-800 bg-green-900/20 px-3 py-2 text-sm text-green-200">
            {resultMsg || "Success! You’ve joined the league."}
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
