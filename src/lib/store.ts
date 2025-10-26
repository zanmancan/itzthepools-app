import { League, Invite } from '@/types'; // Should resolve with new types file

interface Store {
  LEAGUES: League[];
  INVITES: Invite[];
  leagues: Record<string, League>;
  invites: Invite[];
  invitesByToken: Record<string, Invite>;
  invitesByLeague: Record<string, Invite[]>;
  resetStore: () => { leagues: Record<string, League>; invites: Invite[]; invitesByToken: Record<string, Invite>; invitesByLeague: Record<string, Invite[]> };
  getLeague: (leagueId: string) => League | undefined;
  // Add other methods as needed (e.g., from your original store)
}

export const store: Store = {
  LEAGUES: [],
  INVITES: [],
  leagues: {},
  invites: [],
  invitesByToken: {},
  invitesByLeague: {},
  resetStore: () => ({
    leagues: {},
    invites: [],
    invitesByToken: {},
    invitesByLeague: {},
  }),
  getLeague: (leagueId: string) => store.leagues[leagueId],
  // Add other method implementations as needed (e.g., findInviteByToken, revokeInvite)
};