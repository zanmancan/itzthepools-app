"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  // Do the async work here
  async function doUpdatePassword(pw: string) {
    const sb = supabaseBrowser();
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) throw error;
  }

  // Non-async handler to satisfy eslint(no-misused-promises)
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(false);

    // Run the async flow without returning a Promise to React
    void (async () => {
      try {
        await doUpdatePassword(password);
        setOk(true);
        // brief success pause
        setTimeout(() => router.replace("/dashboard"), 600);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message ?? "Unexpected error updating password.");
      }
    })();
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Set a new password</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm">New password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 bg-transparent"
            placeholder="••••••••"
          />
        </label>

        <button className="w-full rounded bg-emerald-600 py-2 font-medium hover:opacity-90">
          Save password
        </button>
      </form>

      {ok && (
        <p className="mt-4 text-sm text-emerald-400">
          Password updated. Redirecting…
        </p>
      )}
      {err && (
        <p className="mt-4 text-sm text-rose-400">Error: {err}</p>
      )}
    </main>
  );
}
