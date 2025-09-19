// src/app/auth/reset/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Stage = "checking" | "form";

export default function ResetPasswordPage() {
  const params = useSearchParams(); // client hook
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // mark IIFE as intentionally not awaited
    void (async () => {
      try {
        // ✅ strict-safe access to the URL param
        const code = params?.get("code");

        // If no code in URL, just show the form (user may already have a temp session)
        if (!code) {
          if (!mounted) return;
          setStage("form");
          return;
        }

        // If arriving via a valid reset link, Supabase should create a temp session
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) throw error;

        if (data.session) {
          setStage("form");
        } else {
          setErr("This password reset link is invalid or expired. Request a new one.");
        }
      } catch (e) {
        if (!mounted) return;
        // eslint-disable-next-line no-console
        console.error("reset: session check failed", e);
        setErr("Unable to validate reset link.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params]);

  async function setNewPassword() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMsg("Password updated. You can close this tab.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(message || "Failed to update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-md space-y-4" data-testid="reset-password">
      <div className="h1">Reset password</div>

      {err && <p className="text-red-400">{err}</p>}

      {stage === "form" ? (
        <>
          <input
            className="input"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />

          {/* fire-and-forget */}
          <button
            className="btn"
            disabled={busy || password.length < 8}
            onClick={() => void setNewPassword()}
          >
            {busy ? "Saving…" : "Set password"}
          </button>

          {msg && <p className="text-emerald-400">{msg}</p>}
          <p className="text-sm opacity-60">Minimum 8 characters (or your configured policy).</p>
        </>
      ) : (
        !err && <p className="opacity-70">Validating reset link…</p>
      )}
    </div>
  );
}
