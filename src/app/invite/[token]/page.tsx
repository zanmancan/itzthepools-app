// src/app/invite/[token]/page.tsx
// Server component: accepts an invite using the token and redirects or shows a clear error.

import { redirect } from "next/navigation";
import { acceptInviteByToken, getAuthedUser } from "@/lib/data/leagues";

type Props = { params: { token: string } };

export default async function AcceptInvitePage({ params }: Props) {
  // Ensure they are signed in – invite acceptance relies on auth.jwt() + auth.uid()
  const { user } = await getAuthedUser();
  if (!user) {
    // If unauthenticated, bounce to login and come back after
    redirect(`/login?next=/invite/${encodeURIComponent(params.token)}`);
  }

  // Try to accept; on success we get a leagueId back
  const { leagueId, error } = await acceptInviteByToken(params.token);

  if (!error && leagueId) {
    // Happy path: go to the league page (or dashboard by default)
    redirect(`/league/${leagueId}`);
  }

  // If we reach here, something failed – render a friendly error
  return (
    <div className="container py-10">
      <div className="card max-w-lg space-y-4">
        <div className="h1">Invite error</div>
        <p className="opacity-80">
          We couldn’t accept that invite. It may be invalid, already used, or
          not addressed to your email.
        </p>
        <pre className="text-sm bg-neutral-900/60 rounded p-3 overflow-x-auto">
          {error?.message ?? "Unknown error"}
        </pre>
        <a className="btn" href="/dashboard">
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
