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
  ownerEmail?: string | null; // ← NEW: who created the league (tp_test_user)
};

const g = globalThis as any;

if (!g.__TEST_INVITES__) g.__TEST_INVITES__ = new Map<string, Invite>();
if (!g.__TEST_LEAGUES__) g.__TEST_LEAGUES__ = new Map<string, League>();

export const INVITES: Map<string, Invite> = g.__TEST_INVITES__;
export const LEAGUES: Map<string, League> = g.__TEST_LEAGUES__;
