// src/app/verify/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Prevent static prerendering; this page depends on URL search params at runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Wrapper adds Suspense so Next is happy with useSearchParams()
export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-lg p-6">Loading…</div>}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const [email, setEmail] = useState(search.get("email") || "");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    setErr(null);
    setMsg(null);
    if (!email) {
      setErr("Enter your email first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data?.error) {
        setErr(data?.error || "Failed to resend email.");
      } else {
        setMsg("Email sent. Check your inbox.");
        setCooldown(45); // simple throttle
      }
    } catch (e: any) {
      setErr(e?.message || "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-lg p-6 space-y-6">
      <h1 className="text-3xl font-bold">Verify your email</h1>
      <p className="text-neutral-300">
        We sent a message to your email with a confirmation <b>link</b>. Click it to finish.
      </p>

      <div className="rounded border border-neutral-700 p-4">
        <label className="text-sm text-neutral-400">Your email</label>
        <input
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => void resend()}
            disabled={busy || cooldown > 0}
            className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </button>
          <Link
            href={`/verify/code?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`}
            className="rounded border border-neutral-600 px-3 py-2"
          >
            Use a code instead
          </Link>
        </div>
        {msg && <div className="text-green-400 text-sm mt-2">{msg}</div>}
        {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
      </div>

      <div className="text-sm text-neutral-400">
        Once verified, we’ll continue to{" "}
        <span className="font-mono">{next}</span>.
      </div>
    </div>
  );
}
