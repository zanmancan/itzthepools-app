"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<WaitScreen message="Please wait…" />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const sb = supabaseBrowser();

  const next = sp.get("next") || "/dashboard";

  // Supabase email link params (non-PKCE)
  const token_hash = sp.get("token_hash");
  const rawType = sp.get("type");

  // Supabase PKCE param (OAuth or “magic link” using pkce)
  const code = sp.get("code");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1) PKCE / OAuth flow — ?code=...
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) router.replace(next);
          return;
        }

        // 2) Email link flow — ?token_hash=...&type=signup|magiclink|recovery|email_change
        const otpType = isEmailOtpType(rawType) ? rawType : null;
        if (token_hash && otpType) {
          const { error } = await sb.auth.verifyOtp({ token_hash, type: otpType });
          if (error) throw error;
          if (!cancelled) router.replace(next);
          return;
        }

        // 3) Already signed in? just continue
        const { data: sessionData } = await sb.auth.getSession();
        if (sessionData.session) {
          if (!cancelled) router.replace(next);
          return;
        }

        // 4) Fallback: nothing recognized — go to login
        if (!cancelled) router.replace(`/login?next=${encodeURIComponent(next)}`);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Authentication error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, token_hash, rawType, next]);

  if (error) {
    return (
      <div className="container mx-auto max-w-xl p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Auth error</h1>
        <p className="text-red-400 text-sm">{error}</p>
        <Link className="underline" href="/dashboard">
          Continue
        </Link>
      </div>
    );
  }

  return <WaitScreen message="Please wait…" />;
}

/** Only allow verifyOtp types that Supabase accepts. */
function isEmailOtpType(
  v: string | null
): v is "signup" | "magiclink" | "recovery" | "email_change" {
  return v === "signup" || v === "magiclink" || v === "recovery" || v === "email_change";
}

function WaitScreen({ message }: { message: string }) {
  return (
    <div className="container mx-auto max-w-xl p-8 space-y-3">
      <h1 className="text-2xl font-semibold">{message}</h1>
      <p className="text-gray-400 text-sm">
        Finishing sign-in. If this takes more than a few seconds, return to your invite and try
        again.
      </p>
      <Link className="underline text-sm" href="/dashboard">
        Continue
      </Link>
    </div>
  );
}
