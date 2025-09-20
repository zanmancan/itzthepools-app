// src/app/signup/SignupClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function SignupClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sb = useMemo(() => supabaseBrowser(), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://itzthepools.com';
      const redirect = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error: signErr } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirect },
      });

      if (signErr) {
        setError(signErr.message);
        setBusy(false);
        return;
      }
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (otp.trim().length < 6) return;
    setBusy(true);
    setError(null);
    try {
      let { error: vErr } = await sb.auth.verifyOtp({ email, token: otp.trim(), type: 'email' });
      if (vErr) {
        const retry = await sb.auth.verifyOtp({ email, token: otp.trim(), type: 'signup' });
        vErr = retry.error;
      }
      if (vErr) {
        setError(vErr.message);
        setBusy(false);
        return;
      }
      router.replace(next);
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold mb-2">Create your account</h1>
      <p className="text-sm text-gray-400 mb-6">
        You’ll be returned to continue joining the league.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          disabled={sent}
          className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
          type="email"
          placeholder="email@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          disabled={sent}
          className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {!sent && (
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Create account'}
          </button>
        )}
      </form>

      {sent && (
        <div className="mt-6 rounded border border-neutral-700 p-4 text-sm">
          <div className="mb-2">
            We sent a confirmation email to <span className="font-mono">{email}</span>.
          </div>
          <ol className="list-disc pl-5 space-y-1">
            <li>Click the link in the email (opens a new tab). After it loads, you’ll be signed in.</li>
            <li>Or paste the 6-digit code below (valid briefly):</li>
          </ol>

          <div className="mt-4 flex items-center gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="w-28 rounded border border-neutral-700 bg-neutral-900 p-2 text-center tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
              onClick={() => void verifyCode()}
              disabled={busy || otp.length !== 6}
            >
              Verify code
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-400">
            After confirmation you’ll continue to: <span className="font-mono">{next}</span>
          </div>
        </div>
      )}

      {error && <div className="mt-4 text-sm text-red-400">{error}</div>}

      {!sent && (
        <div className="mt-6 text-sm">
          Already have an account?{' '}
          <a className="underline" href={`/login?next=${encodeURIComponent(next)}`}>
            Sign in
          </a>
        </div>
      )}
    </div>
  );
}
