// src/app/invite/[token]/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function sameEmail(a?: string | null, b?: string | null) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

/**
 * Invite acceptance flow:
 * - If not authenticated (or auth read fails), redirect to /login?next=/invite/:token
 * - If invite has a target email and it doesn't match the signed-in user, show a friendly mismatch page
 * - Else accept via RPC and send to /league/:id
 */
export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const sb = supabaseServer();

  // 1) Get auth; treat any error like "not signed in" and bounce to login
  const { data: userData, error: userErr } = await sb.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    // No session → go sign in, then come back here to complete acceptance
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  // 2) Load the invite to check email targeting (if any) and used status
  const { data: invite, error: invErr } = await sb
    .from("invites")
    .select("id, email, accepted")
    .eq("token", token)
    .maybeSingle();

  if (invErr) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Invite error</h1>
        <p className="text-red-500">Lookup failed: {invErr.message}</p>
        <a className="underline" href="/dashboard">Back to dashboard</a>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Invite not found</h1>
        <p className="text-gray-400">This invite link is invalid or has expired.</p>
        <a className="underline" href="/dashboard">Back to dashboard</a>
      </div>
    );
  }

  if (invite.accepted) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Invite already used</h1>
        <p className="text-gray-400">This invite has already been accepted.</p>
        <a className="underline" href="/dashboard">Back to dashboard</a>
      </div>
    );
  }

  // 3) If the invite is targeted to an email, require the same signed-in email
  if (invite.email && !sameEmail(invite.email, user.email)) {
    return (
      <div className="container mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Wrong account</h1>
        <p className="text-gray-300">
          This invite was sent to <span className="font-mono">{invite.email}</span>, but you’re signed in as{" "}
          <span className="font-mono">{user.email}</span>.
        </p>
        <div className="space-x-3">
          <a className="underline" href={`/auth/signout?next=${encodeURIComponent(`/invite/${token}`)}`}>
            Sign out and switch accounts
          </a>
          <a className="underline" href="/dashboard">Back to dashboard</a>
        </div>
      </div>
    );
  }

  // 4) Accept the invite (public or targeted) → then go to league
  const { data, error } = await sb.rpc("accept_invite", { p_token: token });
  if (error) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Invite error</h1>
        <p className="text-red-500">{error.message}</p>
        <a className="underline" href="/dashboard">Back to dashboard</a>
      </div>
    );
  }

  const leagueId = data as string;
  redirect(`/league/${leagueId}`);
}
