// src/app/dashboard/page.tsx
import InviteForm from "@/components/InviteForm";
import InvitesPanel from "@/components/InvitesPanel";
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Canonical League type we want to render
type League = {
  id: string;
  name: string;
  ruleset: string | null;
  season: string | null;
};

// Raw row from Supabase join (now includes league_id so we can dedupe)
type LeagueRowRaw = {
  league_id: string;
  role: "owner" | "admin" | "member" | string;
  leagues: League | League[] | null;
};

// Normalized row our UI expects (one per league)
type LeagueRow = {
  leagues: League;
  role: "owner" | "admin" | "member";
};

/** Pick the “higher” role when we see multiple rows for the same league. */
function pickHigherRole(a: string, b: string): "owner" | "admin" | "member" {
  const rank: Record<string, number> = { member: 1, admin: 2, owner: 3 };
  const na = rank[a] ?? 1;
  const nb = rank[b] ?? 1;
  return (na >= nb ? a : b) as "owner" | "admin" | "member";
}

/** Normalize + dedupe per league id. */
function normalizeRows(raw: LeagueRowRaw[]): LeagueRow[] {
  const byLeague = new Map<string, LeagueRow>();

  for (const r of raw) {
    // normalize League object
    const league = Array.isArray(r.leagues) ? r.leagues[0] ?? null : r.leagues;
    if (!league || !league.id) continue;

    // normalize role
    const role = (["owner", "admin", "member"] as const).includes(r.role as any)
      ? (r.role as "owner" | "admin" | "member")
      : "member";

    const existing = byLeague.get(league.id);
    if (!existing) {
      byLeague.set(league.id, { leagues: league, role });
    } else {
      // promote role if needed
      const higher = pickHigherRole(existing.role, role);
      if (higher !== existing.role) {
        byLeague.set(league.id, { leagues: league, role: higher });
      }
    }
  }

  return [...byLeague.values()];
}

export default async function DashboardPage() {
  const sb = supabaseServer();

  // Require auth
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Please sign in</h1>
        <a className="underline" href="/login">
          Go to login
        </a>
      </div>
    );
  }

  // IMPORTANT: filter by this user_id so we only get YOUR memberships
  const { data, error } = await sb
    .from("league_members")
    .select("role, league_id, leagues:league_id ( id, name, ruleset, season )")
    .eq("user_id", user.id) // <— this was missing; without it you can see others’ rows if RLS allows
    .order("role", { ascending: true });

  if (error) {
    return (
      <div className="container mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Dashboard error</h1>
        <p className="text-red-500">{error.message}</p>
      </div>
    );
  }

  const rows = normalizeRows((data ?? []) as LeagueRowRaw[]);

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Leagues</h1>
        <div className="text-sm text-gray-400">
          Signed in as <span className="font-mono">{user.email}</span>
        </div>
      </header>

      {rows.length === 0 && (
        <div className="rounded border border-gray-700 p-6">
          <p>You’re not in any leagues yet.</p>
          <p className="text-sm text-gray-400">Create one or ask for an invite.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => {
          const lg = r.leagues;
          const isOwnerOrAdmin = r.role === "owner" || r.role === "admin";
          return (
            <div key={lg.id} className="rounded border border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{lg.name}</div>
                  <div className="text-xs text-gray-400">
                    Season: {lg.season ?? "n/a"} • Role: {r.role}
                  </div>
                </div>
                <Link
                  className="rounded px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600"
                  href={`/league/${lg.id}`}
                >
                  Open
                </Link>
              </div>

              {isOwnerOrAdmin ? (
                <div className="space-y-3">
                  <div className="rounded border border-gray-700 p-3">
                    <div className="text-sm font-medium mb-2">Invite someone</div>
                    <InviteForm leagueId={lg.id} />
                  </div>
                  <InvitesPanel leagueId={lg.id} />
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
