export interface Invite {
  id: string;
  league_id: string;
  email: string;
  token: string;
  status: string;
  invited_by: string;
  is_public: boolean; // Added to fix TS2353
  // Add other properties as needed
}