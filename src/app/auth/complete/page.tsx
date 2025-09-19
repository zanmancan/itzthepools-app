// src/app/auth/complete/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * Reached via the verification (OTP) email link.
 * If the link is valid, Supabase creates a temporary session and we allow the user to set a password.
 * If the link is invalid/expired/reused, there is no session and we show an error.
 */
export default function CompleteSignupPage() {
  const params = useSearchParams(); // client hook
  const router = useRouter();

  // ✅ Type-safe access: guard with optional chaining so strict TS is happy
  const next = params?.get("next") ?? "/dashboard";

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // If this page is loaded from a valid verification link, we should have a session.
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) throw error;
        if (data.session) {
          setReady(true);
        } else {
          setErr(
            "This verification link is invalid or has expired. Please sign up again."
          );
        }
      } catch (e) {
        if (!mounted) return;
        // eslint-disable-next-line no-console
        console.error("complete: getSession failed", e);
        setErr("Unable to validate session.");
      }
    })();

    // Also catch the real-time auth event arriving on mount
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "SIGNED_IN") setReady(true);
    });

    return () => {
      mounted = false;
      // defensive: in case the subscription is undefined for some reason
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function setNewPassword() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMsg("Password set. Redirecting…");
      // Keep them signed in & send to their next page
      setTimeout(() => {
        // router.replace keeps history tidy; either works
        router.replace(next);
        // window.location.href = next;
      }, 700);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(message || "Failed to set password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-md space-y-4" data-testid="complete-signup">
      <div className="h1">Finish creating your account</div>

      {!ready && !err && (
        <p className="opacity-70">Validating verification link…</p>
      )}
      {err && <p className="text-red-400">{err}</p>}

      {ready && (
        <>
          <p className="opacity-80">
            Your email is verified. Please set a password to continue.
          </p>

          <input
            className="input"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />

          {/* Fire-and-forget pattern for async click */}
          <button
            className="btn"
            disabled={busy || password.length < 8}
            onClick={() => {
              void setNewPassword();
            }}
          >
            {busy ? "Saving…" : "Set password"}
          </button>

          {msg && <p className="text-emerald-400">{msg}</p>}
          <p className="text-sm opacity-60">
            Minimum 8 characters (or your configured policy).
          </p>
        </>
      )}
    </div>
  );
}
