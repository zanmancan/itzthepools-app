// src/app/signup/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-md p-8 text-sm text-gray-400">Loading…</div>}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();

  // Force type to string to avoid "URL vs string" issues downstream
  const next = useMemo<string>(() => params.get("next") ?? "/dashboard", [params]);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    // Poll gently after we ask the user to confirm
    let t: ReturnType<typeof setInterval> | null = null;
    if (awaitingConfirm) {
      t = setInterval(async () => {
        const { data } = await supabaseBrowser().auth.getUser();
        if (data.user) router.replace(next);
      }, 2500);
    }
    // Always return a function (fixes EffectCallback typing)
    return () => {
      if (t) clearInterval(t);
    };
  }, [awaitingConfirm, next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const site = window.location.origin;
      const emailRedirectTo = `${site}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error: signErr } = await supabaseBrowser().auth.signUp({
        email,
        password: pw,
        options: { emailRedirectTo },
      });

      if (signErr) {
        setError(signErr.message || "Sign up failed.");
        setBusy(false);
        return;
      }

      setAwaitingConfirm(true);
    } catch (err: any) {
      setError(err?.message || "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setError(null);
    setBusy(true);
    try {
      const { error: vErr } = await supabaseBrowser().auth.verifyOtp({
        email,
        token: otp.trim(),
        type: "signup",
      });
      if (vErr) {
        setError(vErr.message || "Code verification failed.");
        setBusy(false);
        return;
      }
      router.replace(next);
    } catch (err: any) {
      setError(err?.message || "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="text-sm text-gray-400">You’ll be returned to continue joining the league.</p>

      {!awaitingConfirm ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 outline-none focus:border-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 outline-none focus:border-blue-500"
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create account"}
          </button>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="text-sm text-gray-400">
            Already have an account?{" "}
            <a className="underline" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</a>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded border border-neutral-700 p-4 text-sm">
            <p className="mb-2">
              We sent a confirmation email to <span className="font-mono">{email}</span>.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Click the link in the email (opens a new tab). After it loads, you’ll be signed in.</li>
              <li>Or paste the 6-digit code below (valid briefly):</li>
            </ul>
          </div>

          <div className="flex gap-2 items-center">
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D+/g, "").slice(0, 6))}
              className="w-32 rounded border border-neutral-700 bg-neutral-900 p-2 text-center tracking-widest"
            />
            <button
              type="button"
              onClick={verifyCode}
              disabled={busy || otp.length < 6}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Verify code
            </button>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="text-sm text-gray-400">
            After confirmation you’ll continue to: <span className="font-mono">{next}</span>
          </div>
        </div>
      )}
    </div>
  );
}
