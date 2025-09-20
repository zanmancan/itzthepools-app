"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";
  const router = useRouter();
  const sb = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      // If email confirmation is enabled, user may need to verify.
      // Still move them forward; they'll come back signed in.
      router.replace(next);
    } catch (e: any) {
      setError(e?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-3xl font-semibold">Create your account</h1>
      <p className="text-gray-400 text-sm">
        You’ll be returned to continue joining the league.
      </p>

      {/* Wrap async to satisfy no-misused-promises */}
      <form
        onSubmit={(e) => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          onSubmit(e);
        }}
        className="space-y-3"
      >
        <input
          type="email"
          required
          placeholder="email"
          className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          autoComplete="email"
        />
        <input
          type="password"
          required
          placeholder="password"
          className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          autoComplete="new-password"
          minLength={6}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
        {error && <div className="text-sm text-red-400">{error}</div>}
      </form>

      <div className="text-sm text-gray-400">
        Already have an account?{" "}
        <a className="underline" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</a>
      </div>
    </div>
  );
}
