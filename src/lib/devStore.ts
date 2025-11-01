/* Dev/E2E-only singleton store for invites & leagues.
   One shared instance is attached to globalThis so API routes, server
   components, and test helpers see the SAME data during dev/HMR. */

export type DevInvite = {
  email: string;
  leagueId: string;
  token: string;
  createdAt: string; // ISO
  status: "Active" | "Revoked";
};

export type DevLeague = { id: string; name: string };

export type DevState = {
  invites: DevInvite[];
  leagues: DevLeague[];
  role: "owner" | "member" | "admin";
};

type RevokeQuery = { leagueId: string; email?: string; token?: string };

type DevStore = {
  state: DevState;
  reset(): void;
  listInvites(opts?: { includeRevoked?: boolean }): DevInvite[];
  upsertInvite(v: {
    leagueId: string;
    email: string;
    token?: string;
    createdAt?: string;
    status?: "Active" | "Revoked";
  }): DevInvite;
  revokeInvite(q: RevokeQuery): boolean;
  listLeagues(): DevLeague[];
  upsertLeague(lg: DevLeague): void;
  setRole(role: DevState["role"]): void;
};

function nowISO(): string {
  return new Date().toISOString();
}

function randToken(): string {
  // lightweight token generator for test data
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function createStore(): DevStore {
  const state: DevState = {
    invites: [],
    leagues: [{ id: "lg_owner_revoke", name: "E2E League Owner Revoke" }],
    role: "owner",
  };

  return {
    state,

    reset(): void {
      state.invites = [];
      state.leagues = [{ id: "lg_owner_revoke", name: "E2E League Owner Revoke" }];
      state.role = "owner";
    },

    listInvites(opts): DevInvite[] {
      const includeRevoked = !!opts?.includeRevoked;
      return includeRevoked
        ? [...state.invites]
        : state.invites.filter((i) => i.status !== "Revoked");
    },

    // ---- FIX: explicit return type + non-null assertions on guarded reads ----
    upsertInvite(v): DevInvite {
      const token = v.token ?? randToken();
      const createdAtVal = v.createdAt ?? nowISO();
      const statusVal = v.status ?? "Active";

      // 1) Prefer matching by token
      let idx = state.invites.findIndex((r) => r.token === token);
      if (idx >= 0) {
        const current = state.invites[idx]!;
        state.invites[idx] = {
          email: v.email ?? current.email,
          leagueId: v.leagueId ?? current.leagueId,
          token,
          createdAt: createdAtVal ?? current.createdAt,
          status: statusVal ?? current.status,
        };
        return state.invites[idx]!; // guarded by idx >= 0
      }

      // 2) Otherwise dedupe by leagueId + email
      idx = state.invites.findIndex(
        (r) => r.leagueId === v.leagueId && r.email.toLowerCase() === v.email.toLowerCase()
      );
      if (idx >= 0) {
        const current = state.invites[idx]!;
        state.invites[idx] = {
          ...current,
          token,
          createdAt: createdAtVal,
          status: statusVal,
        };
        return state.invites[idx]!; // guarded by idx >= 0
      }

      // 3) Insert new
      const row: DevInvite = {
        email: v.email,
        leagueId: v.leagueId,
        token,
        createdAt: createdAtVal,
        status: statusVal,
      };
      state.invites.push(row);
      return row;
    },

    revokeInvite(q): boolean {
      const idx = state.invites.findIndex((r) => {
        if (r.leagueId !== q.leagueId) return false;
        if (q.email) return r.email === q.email;
        if (q.token) return r.token === q.token;
        return true;
      });
      if (idx < 0) return false;
      const row = state.invites[idx];
      if (!row) return false; // TS guard
      row.status = "Revoked";
      return true;
    },

    listLeagues(): DevLeague[] {
      return [...state.leagues];
    },

    upsertLeague(lg): void {
      const i = state.leagues.findIndex((x) => x.id === lg.id);
      if (i >= 0) state.leagues[i] = lg;
      else state.leagues.push(lg);
    },

    setRole(role): void {
      state.role = role;
    },
  };
}

const g = globalThis as any;
if (!g.__ITZ_THE_POOLS_DEV_STORE__) {
  g.__ITZ_THE_POOLS_DEV_STORE__ = createStore();
}
const devStore: DevStore = g.__ITZ_THE_POOLS_DEV_STORE__;

export default devStore;
