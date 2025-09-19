// src/app/dashboard/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import EmptyListToast from "./EmptyListToast";

type LeagueRow = {
  id: string;
  name: string;
  season?: string | null;
  ruleset?: string | null;
};

export const metadata: Metadata = {
  title: "Dashboard • Itz The Pools",
  description: "Your leagues and entries",
};

export default async function DashboardPage() {
  // 1) Auth gate (server)
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/dashboard")}`);

  // 2) Fetch leagues (best-effort)
  let leagues: LeagueRow[] = [];
  try {
    const { data, error } = await sb
      .from("leagues")
      .select("id,name,season,ruleset");
    if (!error && data) leagues = data as LeagueRow[];
  } catch {
    // render empty state if query fails
  }

  const hasLeagues = leagues.length > 0;

  return (
    <div className="space-y-6">
      <header className="card">
        <h1 className="h1">Dashboard</h1>
        <p className="mt-1 opacity-70">
          Welcome back{user?.email ? `, ${user.email}` : ""}.
        </p>
      </header>

      {hasLeagues ? (
        <section className="card">
          <h2 className="font-semibold">Your leagues</h2>
          <ul className="mt-3 space-y-2">
            {leagues.map((lg) => (
              <li key={lg.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{lg.name}</div>
                  <div className="text-sm opacity-70">
                    {[lg.ruleset, lg.season].filter(Boolean).join(" • ")}
                  </div>
                </div>
                <Link href={`/league/${lg.id}`} className="btn">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="card">
          <h2 className="font-semibold">No leagues yet</h2>
          <p className="mt-1 opacity-70">
            Create a league for friends or join one with an invite link.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/league/new" className="btn">
              Create league
            </Link>
            <Link href="/join" className="btn">
              Join with invite
            </Link>
          </div>
        </section>
      )}

      {/* Gentle nudge via toast when empty */}
      <EmptyListToast hasLeagues={hasLeagues} />
    </div>
  );
}
