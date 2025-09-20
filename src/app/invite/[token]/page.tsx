import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import InviteAuthBlock from "@/components/InviteAuthBlock";

export const dynamic = "force-dynamic";

function sameEmail(a?: string | null, b?: string | null) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

export default async function InviteLandingPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const sb = supabaseServer();

  // 1) Preview invite so we can render a friendly page for signed-out users
  const { data: preview, error: previewErr } = await sb.rpc("invite_preview", { p_token: token });
  if (previewErr || !preview) {
    return (
      <div className="container mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Invite not found</h1>
        <p className="text-gray-400">{previewErr ? previewErr.message : "This invite link is invalid or expired."}</p>
        <a className="underline" href="/dashboard">Back to dashboard</a>
      </div>
    );
  }

  const leagueName = (preview as any).league_name as string;
  const targetEmail = (preview as any).target_email as string | null;
  const isPublic = !!(preview as any).is_public;

  // 2) Check session
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  const isAuthed = !!user && !userErr;

  // 3) Signed-out UX: **Hybrid**
  if (!isAuthed) {
    return (
      <div className="container mx-auto max-w-xl p-10 space-y-6">
        <h1 className="text-3xl font-semibold">You’re invited! 🎉</h1>
        <p className="text-gray-300">
          You’ve been invited to join <span className="font-semibold">{leagueName}</span>.
        </p>
        {isPublic && (
          <p className="text-sm text-emerald-400">This is a public invite — anyone with the link can join.</p>
        )}

        {/* Primary: passwordless continue (magic link / OTP), plus small links */}
        <InviteAuthBlock token={token} />

        <p className="text-xs text-gray-500">
          After you sign in or create an account, we’ll bring you right back here to finish joining the league.
        </p>
      </div>
    );
  }

  // 4) Wrong-account guard for targeted invites
  if (targetEmail && !sameEmail(targetEmail, user!.email)) {
    return (
      <div className="container mx-auto max-w-xl p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Wrong account</h1>
        <p className="text-gray-300">
          This invite was sent to <span className="font-mono">{targetEmail}</span>, but you’re signed in as{" "}
          <span className="font-mono">{user!.email}</span>.
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

  // 5) Accept immediately (public invite OR matching targeted invite)
  const { data, error } = await sb.rpc("accept_invite", { p_token: token });
  if (error) {
    return (
      <div className="container mx-auto max-w-xl p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Invite error</h1>
        <p className="text-red-500">{error.message}</p>
        <a className="underline" href="/dashboard">Back to dashboard</a>
      </div>
    );
  }

  const leagueId = data as string;
  redirect(`/league/${leagueId}`);
}
