// src/components/InviteAuthBlock.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { siteOrigin } from "@/lib/siteOrigin";

/**
 * Small gate used on the invite page — if the user is not authenticated we show
 * sign-up / sign-in links. If they become authenticated in another tab (magic link)
 * this component notices and updates.
 */
export default function InviteAuthBlock({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signupHref = useMemo(
    () => `/signup?next=${encodeURIComponent(nextPath)}`,
    [nextPath]
  );
  const loginHref = useMemo(
    () => `/login?next=${encodeURIComponent(nextPath)}`,
    [nextPath]
  );

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabaseClient.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });

    // React to auth changes across tabs
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_e, s) => {
      setEmail(s?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-400">Checking session…</div>;
  }

  if (email) {
    return (
      <div className="text-sm text-gray-300">
        You’re signed in as <span className="font-mono">{email}</span>.
      </div>
    );
  }

  return (
    <div className="space-x-3 text-sm">
      <Link className="underline" href={signupHref}>
        Create an account
      </Link>
      <span className="text-gray-500">or</span>
      <Link className="underline" href={loginHref}>
        Sign in
      </Link>
      <span className="text-gray-500"> to accept the invite.</span>
      <div className="mt-2 text-xs text-gray-500">
        Links use <span className="font-mono">{siteOrigin()}</span> so your session works across tabs.
      </div>
    </div>
  );
}
