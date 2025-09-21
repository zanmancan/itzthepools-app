"use client";

import { useMemo } from "react";
import Link from "next/link";
import { siteOrigin } from "@/lib/siteOrigin";

type Props = {
  /** Invite token slug from /invite/[token] */
  token: string;
  /** Optional override for where to continue after auth; defaults to /invite/[token] */
  next?: string;
};

/**
 * Shown on the invite landing page whenever the user is not authenticated yet.
 * Provides canonical links to Sign up / Log in that preserve the invite flow.
 */
export default function InviteAuthBlock({ token, next }: Props) {
  // The canonical absolute URL for the invite we want the user to come back to
  const invitePath = useMemo(
    () => next || `/invite/${token}`,
    [token, next]
  );

  const absoluteInviteUrl = useMemo(
    () => new URL(invitePath, siteOrigin()).toString(),
    [invitePath]
  );

  const signupHref = useMemo(
    () => `/signup?next=${encodeURIComponent(invitePath)}`,
    [invitePath]
  );

  const loginHref = useMemo(
    () => `/login?next=${encodeURIComponent(invitePath)}`,
    [invitePath]
  );

  return (
    <div className="rounded border border-gray-700 p-4 space-y-3">
      <div className="text-sm text-gray-300">
        You’ll need an account before you can join this league.
      </div>

      <div className="flex gap-2">
        <Link
          className="rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500"
          href={signupHref}
        >
          Create account
        </Link>
        <Link
          className="rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600"
          href={loginHref}
        >
          Sign in
        </Link>
      </div>

      <div className="text-xs text-gray-400">
        After you’re signed in, we’ll return you to:
        <div className="mt-1 break-all font-mono">{absoluteInviteUrl}</div>
      </div>
    </div>
  );
}
