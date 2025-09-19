// src/components/Recover.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Recover() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSending(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/complete`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setSending(false);

    if (error) {
      console.error(error);
      setMsg("Sorry—couldn’t send the reset email. Please try again.");
      return;
    }
    setMsg("Check your email for a password reset link.");
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h1 className="mb-4 text-xl font-semibold">Reset your password</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-300">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send reset link"}
        </button>

        {msg && <p className="text-sm text-neutral-300">{msg}</p>}
      </form>
    </section>
  );
}
