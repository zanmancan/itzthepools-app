// src/app/invite/[token]/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage(props: { params: { token: string } }) {
  const token = props.params.token;
  const sb = supabaseServer();

  // Require auth; if missing, bounce to login then come back
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Invite error</h1>
        <p className="text-red-500">Auth error: {userErr.message}</p>
        <a className="underline" href="/login">Go to login</a>
      </div>
    );
  }
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  // Accept via RPC
  const { data, error } = await sb.rpc("accept_invite", { p_token: token });

  if (error) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Invite error</h1>
        <p className="text-red-500">{error.message}</p>
        <div className="mt-4">
          <a className="px-4 py-2 rounded bg-gray-700 text-white" href="/dashboard">Back to dashboard</a>
        </div>
      </div>
    );
  }

  const leagueId = data as string;
  redirect(`/league/${leagueId}`);
}
