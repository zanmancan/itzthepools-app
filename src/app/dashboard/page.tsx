// src/app/dashboard/page.tsx
import InviteForm from "@/components/InviteForm";
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";

export const dynamic = "force-dynamic";

type LeagueRow = {
  leagues: {
    id: string;
    name: string;
    ruleset: string | null;
    season: string | null;
  } | null;
  role: "owner" | "admin" | "member";
};

export default async function DashboardPage() {
  const sb = supabaseServer();

  // Require auth
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Please sign in</h1>
        <a className="underline" href="/login">Go to login</a>
      </div>
    );
  }

  // Fetch leagues you’re in
  const { data, error } = await sb
    .from("league_members")
    .select("role, leagues:league_id ( id, name, ruleset, season )")
    .order("role", { ascending: true });

  if (error) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Dashboard error</h1>
        <p className="text-red-500">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as LeagueRow[];

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Leagues</h1>
        <div className="text-sm text-gray-400">Signed in as <span className="font-mono">{user.email}</span></div>
      </header>

      {rows.length === 0 && (
        <div className="rounded border border-gray-700 p-6">
          <p>You’re not in any leagues yet.</p>
          <p className="text-sm text-gray-400">Create one or ask for an invite.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => {
          const lg = r.leagues!;
          const isOwner = r.role === "owner" || r.role === "admin";
          return (
            <div key={lg.id} className="rounded border border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{lg.name}</div>
                  <div className="text-xs text-gray-400">
                    Season: {lg.season ?? "n/a"} • Role: {r.role}
                  </div>
                </div>
                <Link className="rounded px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600" href={`/league/${lg.id}`}>
                  Open
                </Link>
              </div>

              {isOwner ? (
                <div className="rounded border border-gray-700 p-3">
                  <div className="text-sm font-medium mb-2">Invite someone</div>
                  <InviteForm leagueId={lg.id} />
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  Only owners/admins can create invites for this league.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
