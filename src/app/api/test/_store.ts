// src/app/api/test/_store.ts
// In-memory store for dev/E2E. Lives on globalThis so it survives hot reloads.

export type Invite = {
  token: string;
  email: string;          // invited email
  leagueId: string;
  leagueName: string;
  expiresAt: number;      // epoch ms
  consumedAt?: number | null;
};

export type League = {
  id: string;
  name: string;
  teams: Set<string>;
  ownerEmail: string;     // who owns the league
};

type G = typeof globalThis & {
  __TEST_INVITES__?: Map<string, Invite>;
  __TEST_LEAGUES__?: Map<string, League>;
};

const g = globalThis as G;

if (!g.__TEST_INVITES__) g.__TEST_INVITES__ = new Map<string, Invite>();
if (!g.__TEST_LEAGUES__) g.__TEST_LEAGUES__ = new Map<string, League>();

export const INVITES: Map<string, Invite> = g.__TEST_INVITES__!;
export const LEAGUES: Map<string, League> = g.__TEST_LEAGUES__!;

export function upsertLeague(input: {
  id: string;
  name: string;
  ownerEmail: string;
  teams?: Set<string>;
}) {
  const prev = LEAGUES.get(input.id);
  const league: League = {
    id: input.id,
    name: input.name,
    ownerEmail: (input.ownerEmail || prev?.ownerEmail || "").trim() || "__unknown__@local.test",
    teams: input.teams ?? prev?.teams ?? new Set<string>(),
  };
  LEAGUES.set(league.id, league);
  return league;
}

export function getLeague(id: string) {
  return LEAGUES.get(id) ?? null;
}

export function resetAll() {
  INVITES.clear();
  LEAGUES.clear();
}

// ---- Invites helpers ----
function makeToken() {
  const n = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `tok_${n}_${r}`;
}

export function addInvitesBulk(league: League, emails: string[], ttlMs = 1000 * 60 * 60 * 24 * 7) {
  const now = Date.now();
  const exp = now + ttlMs;
  const created: Invite[] = [];
  for (const raw of emails) {
    const email = String(raw || "").trim();
    if (!email) continue;
    const inv: Invite = {
      token: makeToken(),
      email,
      leagueId: league.id,
      leagueName: league.name,
      expiresAt: exp,
      consumedAt: null,
    };
    INVITES.set(inv.token, inv);
    created.push(inv);
  }
  return created;
}

export function listAllInvites() {
  return Array.from(INVITES.values());
}

export function listInvitesForOwner(ownerEmail: string) {
  const ownerLeagues = new Set(
    Array.from(LEAGUES.values())
      .filter((l) => l.ownerEmail === ownerEmail)
      .map((l) => l.id)
  );
  return Array.from(INVITES.values()).filter((i) => ownerLeagues.has(i.leagueId));
}

export function revokeInvite(token: string) {
  return INVITES.delete(token);
}
