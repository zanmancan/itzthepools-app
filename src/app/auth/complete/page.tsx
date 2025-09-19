"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * Reached via the verification (OTP) email link.
 * If the link is valid, Supabase creates a temporary session and we allow the user to set a password.
 * If the link is invalid/expired/reused, there is no session and we show an error.
 */
export default function CompleteSignupPage() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // If this page is loaded from a valid verification link, we should have a session.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setReady(true);
      } else {
        setErr("This verification link is invalid or has expired. Please sign up again.");
      }
    });

    // Also catch the real-time event arriving on mount
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "SIGNED_IN") setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function setNewPassword() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMsg("Password set. Redirecting…");
      // After setting password, keep them signed in & send to their next page
      setTimeout(() => (location.href = next), 700);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to set password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-md space-y-4">
      <div className="h1">Finish creating your account</div>

      {!ready && !err && <p className="opacity-70">Validating verification link…</p>}
      {err && <p className="text-red-400">{err}</p>}

      {ready && (
        <>
          <p className="opacity-80">Your email is verified. Please set a password to continue.</p>
          <input
            className="input"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
          />
          <button className="btn" disabled={busy || password.length < 8} onClick={setNewPassword}>
            {busy ? "Saving…" : "Set password"}
          </button>
          {msg && <p className="text-emerald-400">{msg}</p>}
          <p className="opacity-60 text-sm">Minimum 8 characters (or your configured policy).</p>
        </>
      )}
    </div>
  );
}
