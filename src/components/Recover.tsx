"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export default function Recover() {
  const sb = supabaseClient;
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function sendReset() {
    setMsg(null);
    setErr(null);
    setSending(true);
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/complete`,
      });
      if (error) throw error;
      setMsg("Check your inbox for the reset link.");
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Failed to send reset email";
      setErr(m);
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void sendReset(); // <-- satisfies no-misused-promises
      }}
      className="space-y-3"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="you@example.com"
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={sending || !email}
        className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send reset link"}
      </button>

      {msg && <p className="text-sm text-green-400">{msg}</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}
    </form>
  );
}
