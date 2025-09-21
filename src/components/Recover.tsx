// src/components/Recover.tsx
"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { siteOrigin } from "@/lib/siteOrigin";

/**
 * Password reset request form.
 * Sends a Supabase reset email that returns to /auth/complete on your canonical origin.
 */
export default function Recover() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function sendReset() {
    setSending(true);
    setMsg(null);
    setErr(null);
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteOrigin()}/auth/complete`,
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
        void sendReset();
      }}
      className="space-y-3"
    >
      <h2 className="text-lg font-semibold">Reset your password</h2>

      <input
        type="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm"
      />

      <button
        type="submit"
        disabled={sending}
        className="rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send reset email"}
      </button>

      {msg && <p className="text-sm text-green-400">{msg}</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      <p className="text-xs text-gray-400">
        We’ll send a link that takes you to{" "}
        <span className="font-mono">{siteOrigin()}/auth/complete</span>.
      </p>
    </form>
  );
}
