// src/lib/devStore.ts
// Minimal in-memory store for E2E/dev. Lives only in the node process.
// Safe because it's behind E2E_DEV_SAFETY and not imported in prod code.

export type DevLeague = {
  id: string;
  name: string;
  ownerEmail?: string;
  createdAt: string;
};

type DevDB = {
  leagues: Map<string, DevLeague>;
};

const GLOBAL_KEY = Symbol.for("__ITZ_DEV_DB__");

// Reuse the same Map across HMR / route reloads in dev
const globalAny = globalThis as any;
if (!globalAny[GLOBAL_KEY]) {
  globalAny[GLOBAL_KEY] = { leagues: new Map<string, DevLeague>() } as DevDB;
}

const db: DevDB = globalAny[GLOBAL_KEY];

export function devDb() {
  return db;
}

export function resetDevDb() {
  db.leagues.clear();
}

export function upsertLeague(input: Partial<DevLeague> & { name: string }) {
  const id = input.id ?? `lg_e2e_${Math.random().toString(36).slice(2, 10)}`;
  const row: DevLeague = {
    id,
    name: input.name,
    ownerEmail: input.ownerEmail ?? "owner@example.com",
    createdAt: new Date().toISOString(),
  };
  db.leagues.set(id, row);
  return row;
}

export function listLeagues(): DevLeague[] {
  return [...db.leagues.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
