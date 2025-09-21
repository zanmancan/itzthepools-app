// src/app/dashboard/page.tsx
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import InvitesPanel from "@/components/InvitesPanel";
import { createSbServer } from "@/lib/supabaseServer"; // ← changed import

type LeagueRow = {
  id: string;
  name: string;
  season: string;
  ruleset: string | null;
  role: "owner" | "admin" | "member";
};

async function getLeagues(): Promise<LeagueRow[]> {
  const sb = createSbServer();

  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr || !user) return [];

  const { data, error } = await sb
    .from("league_members")
    .select("role, leagues:league_id(id,name,season,ruleset)")
    .eq("user_id", user.id);

  if (error || !Array.isArray(data)) return [];

  const rows: LeagueRow[] = data.map((r: any) => ({
    id: r.leagues?.id,
    name: r.leagues?.name,
    season: r.leagues?.season,
    ruleset: r.leagues?.ruleset ?? null,
    role: String(r.role || "member").toLowerCase() as LeagueRow["role"],
  }));
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return rows;
}

export default async function DashboardPage() {
  const leagues = await getLeagues();

  return (
    <AuthGate>
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
              <section key={lg.id} className="w-full rounded-xl border border-gray-800 bg-gray-950/40 p-4">
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

                <div className="mt-3">
                  <div className="mb-2 text-sm font-medium text-gray-300">Invites</div>
                  <InvitesPanel leagueId={lg.id} canManage={canManage} />
                </div>
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
