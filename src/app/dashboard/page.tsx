// src/app/dashboard/page.tsx
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import InvitesPanel from "@/components/InvitesPanel";
import PendingInviteBanner from "@/components/PendingInviteBanner";
import { createSbServer } from "@/lib/supabaseServer";

type LeagueRow = {
  id: string;
  name: string;
  season: string;
  ruleset: string | null;
  role: "owner" | "admin" | "member";
};

type PendingInvite = {
  id: string;
  token: string;
  email: string | null;
  is_public: boolean | null;
  expires_at: string | null;
  league_id: string;
  league_name?: string | null;
  league_season?: string | null;
  created_at?: string | null;
};

async function getLeagues(userId: string): Promise<LeagueRow[]> {
  const sb = createSbServer();
  const { data, error } = await sb
    .from("league_members")
    .select("role, leagues:league_id(id,name,season,ruleset)")
    .eq("user_id", userId);

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

async function getPendingInvitesForEmail(email: string): Promise<PendingInvite[]> {
  const sb = createSbServer();
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from("invites")
    .select(
      "id, token, email, is_public, expires_at, league_id, created_at, leagues:league_id(name,season)"
    )
    .eq("email", email)
    .is("revoked_at", null)
    .or("accepted.is.null,accepted.eq.false")
    .or("expires_at.is.null,expires_at.gt." + nowIso);

  if (error || !Array.isArray(data)) return [];

  const items: PendingInvite[] = data.map((r: any) => ({
    id: r.id,
    token: r.token,
    email: r.email,
    is_public: r.is_public,
    expires_at: r.expires_at,
    league_id: r.league_id,
    league_name: r.leagues?.name ?? null,
    league_season: r.leagues?.season ?? null,
    created_at: r.created_at ?? null,
  }));
  items.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return items;
}

export default async function DashboardPage() {
  const sb = createSbServer();

  // who am I
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();

  const email = !uerr && user?.email ? user.email : "";
  const leagues = user ? await getLeagues(user.id) : [];
  const pending = email ? await getPendingInvitesForEmail(email) : [];

  // owners/admins first
  const owners = leagues.filter((l) => l.role === "owner" || l.role === "admin");
  const members = leagues.filter((l) => l.role === "member");

  return (
    <AuthGate>
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {/* header with signed-in email */}
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Your Leagues</h1>
          <div className="flex items-center gap-3">
            {email && (
              <span className="rounded-full border border-gray-700/60 bg-gray-900/40 px-3 py-1 text-xs text-gray-300">
                {email}
              </span>
            )}
            <Link
              href="/logout"
              className="rounded-full border border-gray-700/60 bg-transparent px-4 py-2 text-sm text-gray-200 hover:bg-gray-800/40"
            >
              Logout
            </Link>
          </div>
        </header>

        {/* small banner nudge if any pending invites exist */}
        {pending.length > 0 && (
          <div className="mb-6">
            <PendingInviteBanner />
          </div>
        )}

        {/* detailed pending invites list */}
        {pending.length > 0 && (
          <section className="mb-6 rounded-xl border border-blue-900/60 bg-blue-950/30 p-4">
            <div className="mb-2 text-sm font-semibold text-blue-200">
              You have {pending.length} pending invite{pending.length > 1 ? "s" : ""}.
            </div>
            <ul className="space-y-2">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-950/60 p-3"
                >
                  <div className="mr-4">
                    <div className="text-sm text-gray-100">
                      {p.league_name || "League"} {p.league_season ? `• ${p.league_season}` : ""}
                    </div>
                    <div className="text-xs text-gray-400">
                      Expires: {p.expires_at ? new Date(p.expires_at).toLocaleString() : "—"}
                    </div>
                  </div>
                  <Link
                    href={`/join/invite?token=${encodeURIComponent(p.token)}`}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
                  >
                    View & Join
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* owners/admins first */}
        {owners.length > 0 && (
          <div className="flex flex-col gap-6">
            {owners.map((lg) => {
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

                  {/* invite tools for owner/admin */}
                  <div className="mt-3">
                    <div className="mb-2 text-sm font-medium text-gray-300">Invites</div>
                    <InvitesPanel leagueId={lg.id} canManage={canManage} />
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* member leagues (no invite tools) */}
        {members.length > 0 && (
          <div className="mt-8 flex flex-col gap-6">
            {members.map((lg) => (
              <section
                key={lg.id}
                className="w-full rounded-xl border border-gray-800 bg-gray-950/40 p-4"
              >
                <div className="mb-1 flex items-center justify-between gap-3">
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
              </section>
            ))}
          </div>
        )}

        {owners.length === 0 && members.length === 0 && (
          <div className="rounded border border-gray-800 bg-gray-950/40 p-6 text-gray-300">
            No leagues yet. Create or join one to get started.
          </div>
        )}
      </div>
    </AuthGate>
  );
}
