// types/database.ts

export type UUID = string & { readonly brand?: unique symbol };

// Helpers constrained so 'id' is known on T
export type TablesInsert<
  T extends { id?: unknown; created_at?: unknown; updated_at?: unknown }
> = Omit<T, "id" | "created_at" | "updated_at"> & Partial<Pick<T, "id">>;

export type TablesUpdate<T extends { id: unknown }> = Partial<Omit<T, "id">> & Pick<T, "id">;

// ---- tables ----
export type Profile = {
  id: UUID; // auth.user id
  email: string;
  team_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type League = {
  id: UUID;
  name: string;
  season: string; // e.g., "2025"
  ruleset: string;
  is_public: boolean;
  owner_id: UUID;
  created_at: string;
  updated_at: string;
};

export type LeagueMember = {
  id: UUID;
  league_id: UUID;
  user_id: UUID;
  role: "owner" | "admin" | "player";
  created_at: string;
};

export type Invite = {
  id: UUID;
  league_id: UUID;
  email: string;
  inviter_id: UUID;
  status: "pending" | "accepted" | "expired" | "revoked";
  token: string;
  created_at: string;
  expires_at: string | null;
};

// ---- collections ----
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: TablesInsert<Profile>; Update: TablesUpdate<Profile> };
      leagues: { Row: League; Insert: TablesInsert<League>; Update: TablesUpdate<League> };
      league_members: { Row: LeagueMember; Insert: TablesInsert<LeagueMember>; Update: TablesUpdate<LeagueMember> };
      invites: { Row: Invite; Insert: TablesInsert<Invite>; Update: TablesUpdate<Invite> };
    };
  };
};
