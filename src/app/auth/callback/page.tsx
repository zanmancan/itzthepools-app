// src/app/auth/callback/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function AuthCallbackPage({ searchParams }: Props) {
  const next = (typeof searchParams.next === "string" && searchParams.next) || "/dashboard";
  const sb = supabaseServer();

  // Surface any error sent back in the URL
  const urlError =
    (typeof searchParams.error_description === "string" && searchParams.error_description) ||
    (typeof searchParams.error === "string" && searchParams.error) ||
    null;

  if (urlError) {
    return (
      <div className="container mx-auto max-w-xl p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Invite error</h1>
        <p className="text-red-400">{urlError}</p>
        <Link className="underline" href="/dashboard">Continue</Link>
      </div>
    );
  }

  // Understand both auth shapes
  const code = typeof searchParams.code === "string" ? searchParams.code : null;
  const token_hash =
    typeof searchParams.token_hash === "string" ? searchParams.token_hash : null;
  const otpType = typeof searchParams.type === "string" ? searchParams.type : null;

  // Already signed in and no auth params? Go on.
  const { data: me } = await sb.auth.getUser();
  if (me.user && !code && !token_hash) {
    redirect(next);
  }

  // ---- PKCE flow (expects string code for your SDK version) ----
  if (code) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return (
        <div className="container mx-auto max-w-xl p-8 space-y-4">
          <h1 className="text-2xl font-semibold">Auth error</h1>
          <p className="text-red-400">{error.message}</p>
          <Link className="underline" href="/dashboard">Continue</Link>
        </div>
      );
    }
    if (data?.session) redirect(next);
  }

  // ---- OTP / magic-link flow (email links) ----
  if (token_hash && otpType) {
    const { data, error } = await sb.auth.verifyOtp({
      type: otpType as "signup" | "magiclink" | "recovery" | "invite",
      token_hash,
    });

    if (error) {
      return (
        <div className="container mx-auto max-w-xl p-8 space-y-4">
          <h1 className="text-2xl font-semibold">Auth error</h1>
          <p className="text-red-400">{error.message}</p>
          <Link className="underline" href="/dashboard">Continue</Link>
        </div>
      );
    }

    if (data?.session) {
      // cookies set by supabaseServer helper
      redirect(next);
    }
  }

  // Fallback / loading
  return (
    <div className="container mx-auto max-w-xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Please wait…</h1>
      <p className="text-gray-400 text-sm">
        Finishing sign-in. If this takes more than a few seconds, go back to your invite and try again.
      </p>
      <Link className="underline" href="/dashboard">Continue</Link>
    </div>
  );
}
