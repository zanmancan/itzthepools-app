/* eslint-disable no-console */

/**
 * Canonical in-memory store for local/dev + E2E “stub backend”.
 * THIS IS NOT PERSISTENT and is only meant for tests & playground APIs.
 *
 * Exposes:
 *  - LEAGUES / INVITES arrays (mutated in-place)
 *  - resetStore(): restore fresh seed data (used by /api/test/reset)
 *  - helper functions used by routes & tests
 *  - getStore(): compatibility shim returning both UPPER-CASE and lower-case
 *    aliases ({ LEAGUES, INVITES, leagues, invites, ... }) to match older code.
 */

export type Role = "owner" | "admin" | "member";

export interface League {
  id: string;
  name: string;
  ownerId: string;
  // userId/email → role
  members: Record<string, Role>;
}

export interface Invite {
  id: string;
  leagueId: string;
  email: string;
  role: Role;
  token: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string; // ISO
}

/** Tiny uid helper for local seeds */
function uid(prefix = ""): string {
  return (
    prefix +
    Math.random().toString(36).slice(2, 7) +
    Math.random().toString(36).slice(2, 7)
  );
}

/* ----------------------------- Mutable stores ----------------------------- */
/** These arrays are intentionally mutable and exported by reference. */
export const LEAGUES: League[] = [];
export const INVITES: Invite[] = [];

/* ------------------------------ Seed builders ----------------------------- */
function buildSeedLeagues(): League[] {
  return [
    {
      id: "lg_owned",
      name: "Owner Sandbox League",
      ownerId: "owner_1",
      members: { owner_1: "owner" },
    },
    {
      id: "lg_public",
      name: "Public Test League",
      ownerId: "owner_2",
      members: { owner_2: "owner" },
    },
  ];
}

function buildSeedInvites(): Invite[] {
  return [
    {
      id: uid("inv_"),
      leagueId: "lg_owned",
      email: "member1@example.com",
      role: "member",
      token: uid("tok_"),
      status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("inv_"),
      leagueId: "lg_public",
      email: "member2@example.com",
      role: "member",
      token: uid("tok_"),
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ];
}

/** Reset both stores in-place so all other modules keep the same array refs. */
export function resetStore() {
  LEAGUES.length = 0;
  INVITES.length = 0;
  for (const l of buildSeedLeagues()) LEAGUES.push(l);
  for (const i of buildSeedInvites()) INVITES.push(i);
  return { leagues: LEAGUES, invites: INVITES };
}

/* Initialize once on module load */
resetStore();

/* ----------------------------- Helper functions --------------------------- */

export function getLeague(leagueId: string): League | undefined {
  return LEAGUES.find((l) => l.id === leagueId);
}

/**
 * Upsert league with strict merging and without indexed access
 * (keeps TS happy under noUncheckedIndexedAccess).
 */
export function upsertLeague(input: Partial<League> & { id: string }): League {
  const existing = LEAGUES.find((l) => l.id === input.id);

  if (existing) {
    existing.name = input.name ?? existing.name;
    existing.ownerId = input.ownerId ?? existing.ownerId;
    existing.members = { ...existing.members, ...(input.members ?? {}) };
    return existing;
  }

  const created: League = {
    id: input.id,
    name: input.name ?? "Untitled League",
    ownerId: input.ownerId ?? "owner_unknown",
    members: input.members ?? {},
  };
  LEAGUES.push(created);
  return created;
}

export function listAllInvites(): Invite[] {
  return [...INVITES];
}

export function listInvitesForOwner(ownerId: string): Invite[] {
  const ownedLeagueIds = LEAGUES.filter((l) => l.ownerId === ownerId).map(
    (l) => l.id
  );
  return INVITES.filter((inv) => ownedLeagueIds.includes(inv.leagueId));
}

export function findInviteById(id: string): Invite | undefined {
  return INVITES.find((i) => i.id === id);
}

export function findInviteByToken(token: string): Invite | undefined {
  return INVITES.find((i) => i.token === token);
}

export function addInvite(
  inv: Omit<Invite, "id" | "createdAt" | "status">
): Invite {
  const created: Invite = {
    ...inv,
    id: uid("inv_"),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  INVITES.push(created);
  return created;
}

/** Accept by token with clear narrowing and safe mutations. */
export function acceptInviteByToken(
  token: string,
  joinKey: string = ""
): { invite: Invite; league: League } {
  const inv = findInviteByToken(token);
  if (!inv) {
    throw Object.assign(new Error("Invite not found for token"), {
      status: 404,
      code: "INVITE_NOT_FOUND",
    });
  }
  if (inv.status === "revoked") {
    throw Object.assign(new Error("Invite is revoked"), {
      status: 409,
      code: "INVITE_REVOKED",
    });
  }

  const league = getLeague(inv.leagueId);
  if (!league) {
    throw Object.assign(new Error("League missing for invite"), {
      status: 500,
      code: "LEAGUE_MISSING",
    });
  }

  if (inv.status === "accepted") {
    return { invite: inv, league };
  }

  inv.status = "accepted";
  const key = (joinKey || inv.email).toLowerCase();
  league.members[key] = inv.role;
  return { invite: inv, league };
}

export function removeInviteById(id: string): boolean {
  const idx = INVITES.findIndex((i) => i.id === id);
  if (idx < 0) return false;
  INVITES.splice(idx, 1);
  return true;
}

export function revokeInvite(id: string): Invite | undefined {
  const inv = findInviteById(id);
  if (!inv) return undefined;
  inv.status = "revoked";
  return inv;
}

/* ------------------------- Compatibility shim (old API) ------------------- */

/**
 * Some pages/tests previously did:
 *   import { getStore } from "@/app/api/test/_store";
 *   const { leagues, invites } = getStore();
 *
 * We keep that pattern working by returning LOWER-CASE aliases that point to
 * the SAME live arrays, plus UPPER-CASE names for newer code.
 */
export function getStore() {
  return {
    // live arrays (both naming styles)
    LEAGUES,
    INVITES,
    leagues: LEAGUES,
    invites: INVITES,

    // utilities
    resetStore,
    getLeague,
    upsertLeague,
    listAllInvites,
    listInvitesForOwner,
    findInviteById,
    findInviteByToken,
    addInvite,
    acceptInviteByToken,
    removeInviteById,
    revokeInvite,
  };
}
