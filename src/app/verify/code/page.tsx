// src/app/verify/code/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

// Prevent static prerendering; this page depends on URL search params at runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Wrapper adds Suspense so Next is happy with useSearchParams()
export default function VerifyCodePage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-sm p-6">Loading…</div>}>
      <VerifyCodeInner />
    </Suspense>
  );
}

function VerifyCodeInner() {
  const search = useSearchParams();
  const router = useRouter();

  const email = search.get("email") || "";
  const next = search.get("next") || "/dashboard";

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!email) {
      setErr("Missing email.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setErr("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, token: code.trim() }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data?.error) {
        setErr(data?.error || "Invalid or expired code.");
        setBusy(false);
        return;
      }
      router.push(next);
    } catch (e: any) {
      setErr(e?.message || "Unexpected error.");
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-sm p-6 space-y-6">
      <h1 className="text-3xl font-bold">Enter your code</h1>
      <p className="text-neutral-300">
        We also included a 6-digit code in the email we sent to{" "}
        <span className="font-mono">{email || "your email"}</span>.
      </p>

      <div className="rounded border border-neutral-700 p-4">
        <label className="text-sm text-neutral-400">6-digit code</label>
        <input
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none"
          placeholder="123456"
        />
        <button
          onClick={() => void submit()}
          disabled={busy || code.trim().length !== 6}
          className="mt-3 rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
        >
          {busy ? "Verifying…" : "Verify"}
        </button>
        {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
      </div>

      <div className="text-sm">
        <Link
          className="text-neutral-400 underline"
          href={`/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`}
        >
          Back to “Check your email”
        </Link>
      </div>
    </div>
  );
}
