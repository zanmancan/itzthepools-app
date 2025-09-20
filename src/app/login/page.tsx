"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { env } from "@/lib/env";

export default function LoginPage() {
  const params = useSearchParams();
  const router = useRouter();
  const next = params?.get("next") ?? params?.get("redirect") ?? "/dashboard";

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  async function signIn() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const sb = supabaseBrowser();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // IMPORTANT: sync the session to server cookies
      if (data.session) {
        await fetch("/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "SIGNED_IN",
            session: {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            },
          }),
        });
      }

      router.replace(next);
    } catch (e: any) {
      setErr(e?.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function startEmailVerification() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const sb = supabaseBrowser();
      const redirectTo = `${env.siteUrl}/auth/complete?redirect=${encodeURIComponent(next)}`;
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
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
      const sb = supabaseBrowser();
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${env.siteUrl}/auth/reset`,
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
        <button className={`btn ${tab === "signin" ? "" : "opacity-60"}`} onClick={() => setTab("signin")}>
          Sign in
        </button>
        <button className={`btn ${tab === "signup" ? "" : "opacity-60"}`} onClick={() => setTab("signup")}>
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
            <button className="btn" disabled={busy} onClick={() => void signIn()}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <button
              className="btn"
              disabled={busy || !email}
              title="Send password reset to the email above"
              onClick={() => void sendReset()}
            >
              {busy ? "Sending…" : "Forgot password"}
            </button>
          </div>
        </>
      )}

      {tab === "signup" && (
        <>
          <button className="btn" disabled={busy || !email} onClick={() => void startEmailVerification()}>
            {busy ? "Sending…" : "Send verification link"}
          </button>
          <p className="text-sm opacity-70">
            After verifying your email, you’ll be asked to set a password. Future logins require your password.
          </p>
        </>
      )}

      {msg && <p className="text-emerald-400">{msg}</p>}
      {err && <p className="text-red-400">{err}</p>}
    </div>
  );
}
