// src/app/dashboard/page.tsx
// Dashboard: owned leagues, memberships, pending invites + quick create form.
// Server action is defined in-file (not exported) to satisfy Next's page export rules.

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

type League = {
  id: string;
  owner_id: string;
  name: string;
  sport: string;
  ruleset?: string | null;
  season?: string | number | null;
  created_at: string;
};

type MemberRow = {
  league_id: string;
  user_id: string;
  role: string | null;
  team_name: string | null;
  created_at: string;
  leagues: League;
};

// ---- Data helpers (server) ----
async function getAuthedUser() {
  const sb = supabaseServer();
  const { data } = await sb.auth.getUser();
  return data?.user ?? null;
}

async function getMyOwnedLeagues() {
  const sb = supabaseServer();
  const user = await getAuthedUser();
  if (!user) return [] as League[];
  const { data } = await sb
    .from("leagues")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  return (data as League[] | null) ?? [];
}

async function getMyMemberships() {
  const sb = supabaseServer();
  const { data } = await sb
    .from("league_members")
    .select("league_id, user_id, role, team_name, created_at, leagues(*)")
    .order("created_at", { ascending: false });
  return (data as MemberRow[] | null) ?? [];
}

async function getMyPendingInvites() {
  const sb = supabaseServer();
  const { data } = await sb
    .from("invites")
    .select("id, league_id, email, token, invited_by, accepted, created_at")
    .eq("accepted", false)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ---- Server Action (NOT exported) ----
async function createLeagueAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const sport = String(formData.get("sport") ?? "").trim() || "ncaa_mbb";
  if (!name) throw new Error("League name is required");

  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("Not authenticated");

  // DB has defaults for ruleset/season. Provide only the required fields.
  const { error } = await sb.from("leagues").insert({
    owner_id: user.id,
    name,
    sport,
  });

  if (error) throw error;
  revalidatePath("/dashboard");
}

// ---- Page ----
export default async function DashboardPage() {
  const user = await getAuthedUser();
  if (!user) {
    return (
      <div className="container py-10">
        <div className="card max-w-lg">Please sign in.</div>
      </div>
    );
  }

  const [owned, memberOf, invites] = await Promise.all([
    getMyOwnedLeagues(),
    getMyMemberships(),
    getMyPendingInvites(),
  ]);

  return (
    <div className="container py-8 space-y-8">
      {/* Quick create */}
      <section className="card max-w-xl space-y-3">
        <div className="h2">Create a league</div>
        {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
        <form action={createLeagueAction} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label">Name</label>
            <input name="name" className="input w-full" placeholder="Dev League" />
          </div>
          <div>
            <label className="label">Sport</label>
            <input name="sport" className="input" defaultValue="ncaa_mbb" />
          </div>
          <button className="btn">Create</button>
        </form>
      </section>

      {/* Owned leagues */}
      <section className="card">
        <div className="h2 mb-2">Leagues you own</div>
        {!owned.length && <p className="opacity-70">You don’t own any leagues yet.</p>}
        <ul className="space-y-2">
          {owned.map((l) => (
            <li key={l.id} className="flex items-center justify-between rounded bg-neutral-900/60 p-3">
              <div>
                <div className="font-medium">{l.name}</div>
                <div className="text-xs opacity-70">
                  {l.sport} • {l.season ?? ""} {l.ruleset ? `• ${l.ruleset}` : ""}
                </div>
              </div>
              <a className="btn" href={`/league/${l.id}`}>
                Open
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Memberships */}
      <section className="card">
        <div className="h2 mb-2">Leagues you’re in</div>
        {!memberOf.length && <p className="opacity-70">No memberships yet.</p>}
        <ul className="space-y-2">
          {memberOf.map((m) => (
            <li
              key={`${m.league_id}-${m.user_id}`}
              className="flex items-center justify-between rounded bg-neutral-900/60 p-3"
            >
              <div>
                <div className="font-medium">{m.leagues?.name ?? m.league_id}</div>
                <div className="text-xs opacity-70">
                  role: {m.role ?? "member"}
                  {m.team_name ? ` • team: ${m.team_name}` : ""}
                </div>
              </div>
              <a className="btn" href={`/league/${m.league_id}`}>
                Open
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Pending invites */}
      <section className="card">
        <div className="h2 mb-2">Pending invites</div>
        {!invites.length && <p className="opacity-70">You have no pending invites.</p>}
        <ul className="space-y-2">
          {invites.map((i: any) => (
            <li key={i.id} className="flex items-center justify-between rounded bg-neutral-900/60 p-3">
              <div>
                <div className="font-medium">Invite to league {i.league_id}</div>
                <div className="text-xs opacity-70">{i.email}</div>
              </div>
              <a className="btn" href={`/invite/${i.token}`}>
                Accept
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
