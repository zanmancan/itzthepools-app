// src/app/api/test/_mem.ts
// Minimal in-memory store used by test/dev routes.

export type Invite = {
  id: string;
  token: string;
  email: string;
  league_id: string;
  is_public: boolean;
  used: boolean;
  revoked: boolean;
  created_at: string; // ISO
  expires_at: string; // ISO
};

export type League = {
  id: string;
  name: string;
};

export type Store = {
  leagues: Record<string, League>;
  invites: Record<string, Invite>;
  memberships: Record<string, Set<string>>; // userId -> leagues
  teamNames: Record<string, Set<string>>;    // leagueId -> lowercased team names
};

declare global {
  // eslint-disable-next-line no-var
  var __TEST_STORE__: Store | undefined;
}

function emptyStore(): Store {
  return {
    leagues: {},
    invites: {},
    memberships: {},
    teamNames: {},
  };
}

export function getStore(): Store {
  if (!globalThis.__TEST_STORE__) {
    globalThis.__TEST_STORE__ = emptyStore();
  }
  return globalThis.__TEST_STORE__!;
}

export function resetTestStore(): void {
  globalThis.__TEST_STORE__ = emptyStore();
}

// ---------- tiny utilities ----------

function rid(len = 24): string {
  const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[(Math.random() * alphabet.length) | 0];
  return out;
}

// Ensure a league exists; return a concrete League (never undefined).
function ensureLeague(store: Store, id: string, name?: string): League {
  let lg = store.leagues[id];
  if (lg) {
    if (name && name !== lg.name) {
      lg = { id, name };
      store.leagues[id] = lg;
    }
  } else {
    lg = { id, name: name ?? id };
    store.leagues[id] = lg;
  }
  if (!store.teamNames[id]) store.teamNames[id] = new Set<string>();
  return lg; // <- always a League
}

// Seed an invite (used by /api/test/* endpoints)
export function seedInvite(opts: {
  leagueId: string;
  email: string;
  expiresInMins?: number;
}): Invite {
  const { leagueId, email, expiresInMins = 60 } = opts;
  const store = getStore();
  ensureLeague(store, leagueId);

  const now = new Date();
  const exp = new Date(now.getTime() + expiresInMins * 60_000);

  const invite: Invite = {
    id: rid(32),
    token: rid(24),
    email,
    league_id: leagueId,
    is_public: false,
    used: false,
    revoked: false,
    created_at: now.toISOString(),
    expires_at: exp.toISOString(),
  };

  store.invites[invite.id] = invite;
  return invite;
}

// Mark an invite as used (returns the invite or null if invalid)
export function markInviteUsedByToken(token: string): Invite | null {
  const store = getStore();
  const iv =
    Object.values(store.invites).find((i) => i.token === token) ?? null;
  if (!iv) return null;
  if (iv.revoked) return null;

  const now = Date.now();
  const exp = Date.parse(iv.expires_at);
  if (Number.isFinite(exp) && now > exp) return null;

  iv.used = true;
  return iv;
}

// Team-name helpers
export function isTeamNameAvailable(leagueId: string, name: string): boolean {
  const store = getStore();
  ensureLeague(store, leagueId);
  const set = store.teamNames[leagueId] ?? new Set<string>();
  return !set.has(name.trim().toLowerCase());
}

export function reserveTeamName(leagueId: string, name: string): void {
  const store = getStore();
  ensureLeague(store, leagueId);
  const set =
    store.teamNames[leagueId] ?? (store.teamNames[leagueId] = new Set());
  set.add(name.trim().toLowerCase());
}

// Optional convenience for tests
export function addMembership(userId: string, leagueId: string): void {
  const store = getStore();
  ensureLeague(store, leagueId);
  const m = store.memberships[userId] ?? new Set<string>();
  m.add(leagueId);
  store.memberships[userId] = m;
}
