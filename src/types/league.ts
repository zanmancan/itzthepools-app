export interface League {
  id: string;
  name: string;
  sport: string;
  season: string; // Added to fix TS2353
  owner_id: string;
  // Add other properties as needed
}