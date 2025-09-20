// src/app/signup/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-md p-6">Loading…</div>}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw, next }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data?.error) {
        setError(data?.error || "Sign up failed.");
        setBusy(false);
        return;
      }
      setSent(true); // Show “check your email” state
    } catch (e: any) {
      setError(e?.message || "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-3xl font-bold">Create your account</h1>

      {!sent ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-neutral-400">
            You’ll be returned to continue joining the league.
          </p>

          <input
            type="email"
            placeholder="you@example.com"
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="••••••••"
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            minLength={6}
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create account"}
          </button>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="text-sm">
            Already have an account?{" "}
            <Link className="underline" href={`/login?next=${encodeURIComponent(next)}`}>
              Sign in
            </Link>
          </div>
        </form>
      ) : (
        <div className="rounded border border-neutral-700 p-4 space-y-3">
          <div className="text-green-400 font-medium">Check your email to complete setup.</div>
          <p className="text-sm text-neutral-300">
            We sent a confirmation link to <span className="font-mono">{email}</span>. Click it to
            verify your email. You can also enter the 6-digit code instead.
          </p>
          <div className="flex gap-2">
            <Link
              href={`/verify/code?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`}
              className="rounded border border-neutral-600 px-3 py-2 text-sm"
            >
              Enter 6-digit code
            </Link>
            <Link
              href={`/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`}
              className="rounded border border-neutral-600 px-3 py-2 text-sm"
            >
              Re-send / Change email
            </Link>
          </div>
          <div className="text-xs text-neutral-500">
            After verification you’ll be sent back to{" "}
            <span className="font-mono">{next}</span>.
          </div>
        </div>
      )}
    </div>
  );
}
