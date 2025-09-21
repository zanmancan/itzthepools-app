// src/app/dashboard/page.tsx
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import InvitesPanel from "@/components/InvitesPanel";
import { createSbServer } from "@/lib/supabaseServer";

// Always read cookies on each request
export const dynamic = "force-dynamic";
export const revalidate = 0;

type LeagueRow = {
  id: string;
  name: string;
  season: string;
  ruleset: string | null;
  role: "owner" | "admin" | "member";
};

async function getLeagues(): Promise<LeagueRow[]> {
  const sb = createSbServer();

  // who am I
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr || !user) return [];

  // fetch leagues + role
  const res: any = await sb
    .from("league_members")
    .select("role, leagues:league_id(id,name,season,ruleset)")
    .eq("user_id", user.id);

  if (res?.error || !Array.isArray(res?.data)) return [];

  const rows: LeagueRow[] = res.data
    .map((r: any) => ({
      id: r.leagues?.id,
      name: r.leagues?.name,
      season: r.leagues?.season,
      ruleset: r.leagues?.ruleset ?? null,
      role: (String(r.role || "member").toLowerCase() as LeagueRow["role"]),
    }))
    .filter((r: LeagueRow) => !!r.id);

  // Partition: owners/admins first, then members (stable sort within groups by name)
  const manage = rows
    .filter((r) => r.role === "owner" || r.role === "admin")
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const member = rows
    .filter((r) => r.role === "member")
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return [...manage, ...member];
}

export default async function DashboardPage() {
  const leagues = await getLeagues();

  return (
    <AuthGate title="Sign in to view your Dashboard" note="We couldn't detect a session yet.">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Your Leagues</h1>
          <Link
            href="/logout"
            className="rounded-full border border-gray-700/60 bg-transparent px-4 py-2 text-sm text-gray-200 hover:bg-gray-800/40"
          >
            Logout
          </Link>
        </header>

        <div className="flex flex-col gap-6">
          {leagues.map((lg) => {
            const canManage = lg.role === "owner" || lg.role === "admin";

            return (
              <section
                key={lg.id}
                className="w-full rounded-xl border border-gray-800 bg-gray-950/40 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold">{lg.name}</div>
                    <div className="text-sm text-gray-400">
                      Season: {lg.season} • Role: {lg.role}
                    </div>
                  </div>
                  <Link
                    href={`/league/${lg.id}`}
                    className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-gray-100 hover:bg-gray-700"
                  >
                    Open
                  </Link>
                </div>

                {/* Only show Invites tools for leagues the user can manage */}
                {canManage ? (
                  <div className="mt-3">
                    <div className="mb-2 text-sm font-medium text-gray-300">Invites</div>
                    <InvitesPanel leagueId={lg.id} canManage={canManage} />
                  </div>
                ) : null}
              </section>
            );
          })}

          {leagues.length === 0 && (
            <div className="rounded border border-gray-800 bg-gray-950/40 p-6 text-gray-300">
              No leagues yet. Create or join one to get started.
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}
