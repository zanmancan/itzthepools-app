"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Props = { token: string };

export default function InviteAuthBlock({ token }: Props) {
  const sb = supabaseBrowser();

  const siteOrigin = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return process.env.NEXT_PUBLIC_SITE_URL || "";
  }, []);

  const nextUrl = `/invite/${token}`;
  const signinHref = `/login?next=${encodeURIComponent(nextUrl)}`;
  const signupHref = `/signup?next=${encodeURIComponent(nextUrl)}`;

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");

  /** Sends passwordless magic link to the email, and also allows OTP code path */
  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const redirectTo = (process.env.NEXT_PUBLIC_SITE_URL || siteOrigin || "") + nextUrl;
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setErr(error.message);
        return;
      }
      setSent(true);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  /** Verifies a 6-digit OTP code from the email without following the link */
  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await sb.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) {
        setErr(error.message);
        return;
      }
      // Auth complete in this tab; reload so the server page accepts the invite.
      window.location.href = nextUrl;
    } catch (e: any) {
      setErr(e?.message ?? "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Wrap async with a non-async handler to satisfy no-misused-promises */}
      <form
        onSubmit={(e) => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          sendMagicLink(e);
        }}
        className="space-y-3"
      >
        <label className="block text-sm text-gray-300">Continue with your email</label>
        <input
          type="email"
          required
          placeholder="your@email.com"
          className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send magic link"}
        </button>

        {sent && (
          <p className="text-sm text-emerald-400">
            Check your inbox—open the link or enter the 6-digit code below.
          </p>
        )}

        {err && <div className="text-sm text-red-400">{err}</div>}
      </form>

      {/* Optional: enter 6-digit code instead of tapping the email link */}
      <div className="space-y-2">
        {!showCode ? (
          <button
            type="button"
            className="text-sm underline text-gray-300"
            onClick={() => setShowCode(true)}
          >
            I have a 6-digit code
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              verifyCode(e);
            }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="Enter code"
                className="w-40 rounded border border-gray-700 bg-black px-3 py-2 text-sm tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || code.length !== 6 || !email}
                className="rounded bg-gray-700 px-3 py-2 text-white hover:bg-gray-600 disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Verify"}
              </button>
            </div>
            <p className="text-xs text-gray-500">We sent the code to the email above.</p>
          </form>
        )}
      </div>

      {/* Alternate paths for power users */}
      <div className="text-sm text-gray-400">
        Prefer passwords? <a className="underline" href={signinHref}>Use password instead</a>
        {" · "}
        New here? <a className="underline" href={signupHref}>Create account</a>
      </div>
    </div>
  );
}
