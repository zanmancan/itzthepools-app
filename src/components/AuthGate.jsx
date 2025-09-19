// src/components/AuthGate.jsx
"use client";

import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export default function AuthGate({ children }) {
  const supabase = supabaseClient();

  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  if (session) return children;

  async function sendMagicLink(e) {
    e.preventDefault();
    setMsg("");
    try {
      setSending(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_SITE_URL || window.location.origin,
        },
      });
      if (error) throw error;
      setMsg("Magic link sent! Check your email.");
    } catch (err) {
      setMsg(`Error: ${err?.message || String(err)}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <div className="rounded-lg border bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
        <form onSubmit={sendMagicLink} className="space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            autoComplete="email"
          />
          <button
            className="w-full rounded bg-black px-3 py-2 font-medium text-white disabled:opacity-50"
            disabled={sending}
          >
            {sending ? "Sending…" : "Email me a magic link"}
          </button>
        </form>
        {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}
      </div>
    </div>
  );
}
