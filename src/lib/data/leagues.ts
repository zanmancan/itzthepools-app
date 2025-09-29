// src/lib/data/leagues.ts
// Server-only helpers to read/write leagues, members, and invites via Supabase.
// Each function returns { data, error } so the caller can render rich errors.

import "server-only";
import { supabaseServer } from "@/lib/supabaseServer";

export type League = {
  id: string;
  owner_id: string;
  name: string;
  sport: string;
  ruleset?: string | null;
  season?: string | number | null;
  created_at: string;
};

export type MemberRow = {
  league_id: string;
  user_id: string;
  role: string | null;
  team_name: string | null;
  created_at: string;
  leagues: League; // embedded league
};

export async function getAuthedUser() {
  const sb = supabaseServer();
  const { data, error } = await sb.auth.getUser();
  return { user: data?.user ?? null, error };
}

export async function getMyMemberships() {
  const sb = supabaseServer();
  // Because of our RLS, a user can select rows where user_id = auth.uid()
  // and PostgREST can embed the related league row via FK (leagues(*))
  const { data, error } = await sb
    .from("league_members")
    .select("league_id, user_id, role, team_name, created_at, leagues(*)")
    .order("created_at", { ascending: false });

  return { data: (data as MemberRow[] | null) ?? null, error };
}

export async function getMyOwnedLeagues() {
  const sb = supabaseServer();
  const { user } = await getAuthedUser();
  if (!user) return { data: null, error: new Error("Not authenticated") };

  // Owner can read their leagues via RLS (policy already set)
  const { data, error } = await sb
    .from("leagues")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return { data: (data as League[] | null) ?? null, error };
}

export async function getMyPendingInvites() {
  const sb = supabaseServer();
  // Our RLS allows: invited_by = auth.uid() OR email matches jwt email.
  const { data, error } = await sb
    .from("invites")
    .select("id, league_id, email, token, invited_by, accepted, created_at")
    .eq("accepted", false)
    .order("created_at", { ascending: false });

  return { data: data ?? null, error };
}

