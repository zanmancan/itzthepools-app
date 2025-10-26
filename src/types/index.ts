export interface League {
  id: string;
  name: string;
  sport: string;
  season: string;
  owner_id: string;
  // Add other properties as needed
}

export interface Invite {
  id: string;
  league_id: string;
  email: string;
  token: string;
  status: string;
  invited_by: string;
  is_public: boolean;
  // Add other properties as needed
}