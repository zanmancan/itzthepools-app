"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { addToast } = useToast();

  const [stage, setStage] = useState<"loading" | "form" | "done">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [updating, setUpdating] = useState(false);

  // 1) exchange code for session
  useEffect(() => {
    (async () => {
      const code = params.get("code");
      if (!code) {
        setStage("form"); // allow update if they already have a session
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        addToast(error.message, "error");
        setStage("form");
        return;
      }
      setStage("form");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (password.length < 6) {
      addToast("Password must be at least 6 characters.", "error");
      return;
    }
    if (password !== confirm) {
      addToast("Passwords do not match.", "error");
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStage("done");
      addToast("Password updated!", "success");
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (e: any) {
      addToast(e?.message ?? "Failed to update password", "error");
    } finally {
      setUpdating(false);
    }
  }

  if (stage === "loading") {
    return (
      <div className="card">
        <div className="h1">Reset Password</div>
        <p className="opacity-70 mt-2">Preparing reset…</p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="card">
        <div className="h1">Password reset</div>
        <p className="mt-2">Redirecting to your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="card max-w-md">
      <div className="h1 mb-3">Set a new password</div>
      <label className="block mb-3">
        <div className="mb-1 opacity-70">New password</div>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </label>
      <label className="block mb-4">
        <div className="mb-1 opacity-70">Confirm new password</div>
        <input
          className="input"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
        />
      </label>
      <button className="btn" onClick={submit} disabled={updating}>
        {updating ? "Updating…" : "Update Password"}
      </button>
    </div>
  );
}
