// src/app/signup/SignupClient.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { siteOrigin } from "@/lib/siteOrigin";

export default function SignupClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError(null);

      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // This is the magic: Supabase will redirect to our callback, which
            // sets the cookie session and then redirects back to `next`.
            emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(
              next
            )}`,
          },
        });

        if (error) throw error;
        setSent(true);
      } catch (err: any) {
        setError(err?.message ?? "Could not sign up");
      } finally {
        setBusy(false);
      }
    },
    [email, password, next, supabase]
  );

  const verifyCode = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp.replace(/\D/g, "").slice(0, 6),
        type: "email",
      });
      if (error) throw error;

      // With OTP flow we already have a session cookie — go to `next`.
      router.replace(next);
    } catch (err: any) {
      setError(err?.message ?? "Invalid code");
    } finally {
      setBusy(false);
    }
  }, [email, otp, next, router, supabase]);

  return (
    <div className="max-w-md space-y-4">
      {!sent ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            className="w-full rounded border border-neutral-700 bg-black px-3 py-2"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded border border-neutral-700 bg-black px-3 py-2"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="rounded bg-blue-600 px-4 py-2 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Creating…" : "Create account"}
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      ) : (
        <div className="rounded border border-neutral-700 p-4">
          <p className="mb-2 text-sm">
            We sent a confirmation email to <span className="font-mono">{email}</span>.
          </p>
          <ul className="ml-5 list-disc text-sm text-gray-300">
            <li>
              Click the link in the email (opens a new tab). After it loads, you’ll be signed in.
            </li>
            <li>Or paste the 6-digit code below (valid briefly):</li>
          </ul>

          <div className="mt-3 flex items-center gap-2">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-28 rounded border border-neutral-700 bg-black px-3 py-2 text-center tracking-widest"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button
              onClick={verifyCode}
              disabled={busy || otp.length < 6}
              className="rounded bg-blue-600 px-3 py-2 disabled:opacity-50"
            >
              Verify code
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

          <p className="mt-3 text-xs text-gray-400">
            After confirmation you’ll continue to:{" "}
            <span className="font-mono">{next}</span>
          </p>
        </div>
      )}
    </div>
  );
}
