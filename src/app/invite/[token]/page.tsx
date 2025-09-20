import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function sameEmail(a?: string | null, b?: string | null) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

export default async function InviteLandingPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const sb = supabaseServer();

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

  const { data: { user }, error: userErr } = await sb.auth.getUser();
  const isAuthed = !!user && !userErr;

  if (!isAuthed) {
    const next = encodeURIComponent(`/invite/${token}`);
    return (
      <div className="container mx-auto max-w-xl p-8 space-y-6">
        <h1 className="text-3xl font-semibold">You’re invited! 🎉</h1>
        <p className="text-gray-300">
          You’ve been invited to join <span className="font-semibold">{leagueName}</span>.
        </p>
        {isPublic && <p className="text-sm text-emerald-400">This is a public invite — anyone with the link can join.</p>}
        <div className="space-y-2">
          <a className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500" href={`/login?next=${next}`}>
            Sign in to accept
          </a>
          <div className="text-sm text-gray-400">
            New here?{" "}
            <a className="underline" href={`/signup?next=${next}`}>
              Create an account
            </a>{" "}
            and you’ll be brought back to finish joining the league.
          </div>
        </div>
      </div>
    );
  }

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
