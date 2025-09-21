"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient"; // your browser client
import { siteOrigin } from "@/lib/siteOrigin";

export default function SignupClient() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null); // when not null we show the “check email / enter code” UI

  const continueTo = useMemo(() => {
    try {
      return new URL(next, siteOrigin()).toString();
    } catch {
      return `${siteOrigin()}/dashboard`;
    }
  }, [next]);

  async function doSignup() {
    setBusy(true);
    setError(null);
    try {
      // Magic-link + OTP email
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(
            next
          )}`,
        },
      });
      if (error) throw error;
      setSentTo(email); // switch UI to “verify”
    } catch (e: any) {
      setError(e?.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  async function doVerify() {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabaseClient.auth.verifyOtp({
        email: sentTo || email,
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;
      window.location.href = continueTo; // you’re signed in now
    } catch (e: any) {
      setError(e?.message || "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="text-sm text-gray-400">
        You’ll be returned to continue joining the league.
      </p>

      {/* Step 1: collect email/password */}
      {!sentTo && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void doSignup(); // satisfies no-misused-promises
          }}
          className="space-y-3"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}

      {/* Step 2: tell them to click the link OR enter OTP */}
      {sentTo && (
        <div className="rounded border border-gray-700 p-3">
          <p className="text-sm">
            We sent a confirmation email to{" "}
            <span className="font-mono">{sentTo}</span>.
          </p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-gray-300">
            <li>
              Click the link in the email (opens a new tab). After it loads,
              you’ll be signed in.
            </li>
            <li>Or paste the 6-digit code below (valid briefly):</li>
          </ul>

          <div className="mt-4 flex items-center gap-2">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              className="w-32 rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-center tracking-widest"
            />
            <button
              type="button"
              onClick={() => void doVerify()}
              disabled={busy || otp.length !== 6}
              className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify code"}
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

          <p className="mt-3 text-xs text-gray-400">
            After confirmation you’ll continue to:{" "}
            <span className="font-mono">{continueTo}</span>
          </p>
        </div>
      )}
    </div>
  );
}
