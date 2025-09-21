// src/app/signup/SignupClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { siteOrigin } from "@/lib/siteOrigin";

type Props = { next?: string };

export default function SignupClient({ next = "/dashboard" }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After signup we show the “check your email / or enter code” block
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [otp, setOtp] = useState("");

  const redirectTo = useMemo(
    () => `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    [next]
  );

  // If the user already got signed in (e.g., came back via magic link in a new tab),
  // reflect that in this tab and continue.
  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) window.location.assign(next);
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_e, s) => {
      if (s?.user) window.location.assign(next);
    });
    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setAwaitingEmailConfirm(true);
    } catch (err: any) {
      setError(err?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (otp.replace(/\D/g, "").length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabaseClient.auth.verifyOtp({
        email,
        token: otp.replace(/\D/g, "").slice(0, 6),
        type: "email",
      });
      if (error) throw error;
      if (data.session) window.location.assign(next);
    } catch (err: any) {
      setError(err?.message ?? "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  if (awaitingEmailConfirm) {
    return (
      <div className="space-y-4 rounded border border-gray-700 p-4">
        <p className="text-sm">
          We sent a confirmation email to <span className="font-mono">{email}</span>.
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-300">
          <li>Click the link in the email (opens a new tab). After it loads, you’ll be signed in.</li>
          <li>Or paste the 6-digit code below (valid briefly):</li>
        </ul>

        <div className="mt-4 flex items-center gap-2">
          <input
            inputMode="numeric"
            pattern="\d{6}"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-32 rounded border border-neutral-700 bg-neutral-900 p-2 text-center tracking-widest"
          />
          <button
            type="button"
            onClick={verifyCode}
            disabled={busy || otp.replace(/\D/g, "").length !== 6}
            className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
          >
            Verify code
          </button>
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}
        <p className="text-xs text-gray-400">
          After confirmation you’ll continue to: <span className="font-mono">{next}</span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm"
      />
      <input
        type="password"
        required
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create account"}
      </button>
      {error && <div className="text-sm text-red-400">{error}</div>}
    </form>
  );
}
