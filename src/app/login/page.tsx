"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  // Two tabs: Sign in (password) and Create account (email verification)
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // shared
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // password login
  const [password, setPassword] = useState("");

  async function signIn() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // success
      location.href = next;
    } catch (e: any) {
      setErr(e?.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  // Email-only signup → sends verification (OTP) link.
  // When they click it, they will land on /auth/complete to set a password.
  async function startEmailVerification() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${location.origin}/auth/complete?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setMsg("Verification link sent. Check your email to continue.");
    } catch (e: any) {
      setErr(e?.message ?? "Could not send verification email");
    } finally {
      setBusy(false);
    }
  }

  async function sendReset() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/reset`,
      });
      if (error) throw error;
      setMsg("Password reset email sent.");
    } catch (e: any) {
      setErr(e?.message ?? "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-md space-y-4">
      <div className="h1">Account</div>

      <div className="flex gap-2">
        <button
          className={`btn ${tab === "signin" ? "" : "opacity-60"}`}
          onClick={() => setTab("signin")}
        >
          Sign in
        </button>
        <button
          className={`btn ${tab === "signup" ? "" : "opacity-60"}`}
          onClick={() => setTab("signup")}
        >
          Create account
        </button>
      </div>

      <input
        className="input"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {tab === "signin" && (
        <>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                void signIn();
              }}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <button
              className="btn"
              disabled={busy || !email}
              title="Send password reset to the email above"
              onClick={() => {
                void sendReset();
              }}
            >
              {busy ? "Sending…" : "Forgot password"}
            </button>
          </div>
        </>
      )}

      {tab === "signup" && (
        <>
          <button
            className="btn"
            disabled={busy || !email}
            onClick={() => {
              void startEmailVerification();
            }}
          >
            {busy ? "Sending…" : "Send verification link"}
          </button>
          <p className="opacity-70 text-sm">
            After verifying your email, you’ll be asked to set a password. Future logins require
            your password.
          </p>
        </>
      )}

      {msg && <p className="text-emerald-400">{msg}</p>}
      {err && <p className="text-red-400">{err}</p>}
    </div>
  );
}
