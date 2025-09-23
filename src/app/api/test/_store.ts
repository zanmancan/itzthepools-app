// src/app/api/test/_store.ts
// Simple in-memory store shared by test-only routes and (temporarily)
// by the "real" invite routes until the DB is wired.

export type Invite = {
  token: string;
  email: string;         // invited email
  leagueId: string;
  leagueName: string;
  expiresAt: number;     // epoch ms (UTC)
  consumedAt?: number | null;
};

export type League = {
  id: string;
  name: string;
  teams: Set<string>;    // team names (unique per league)
};

const g = globalThis as any;

if (!g.__TEST_INVITES__) g.__TEST_INVITES__ = new Map<string, Invite>();
if (!g.__TEST_LEAGUES__) g.__TEST_LEAGUES__ = new Map<string, League>();

export const INVITES: Map<string, Invite> = g.__TEST_INVITES__;
export const LEAGUES: Map<string, League> = g.__TEST_LEAGUES__;
