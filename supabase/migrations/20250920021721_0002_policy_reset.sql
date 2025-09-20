-- 0002_policy_reset.sql
-- Make policy creation idempotent by dropping if exists, then recreating.

-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- LEAGUES
drop policy if exists "leagues_member_or_owner_can_read" on public.leagues;
create policy "leagues_member_or_owner_can_read"
  on public.leagues for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.league_members lm
      where lm.league_id = leagues.id and lm.user_id = auth.uid()
    )
  );

drop policy if exists "leagues_owner_can_write" on public.leagues;
create policy "leagues_owner_can_write"
  on public.leagues for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- LEAGUE MEMBERS
drop policy if exists "members_read_self_or_owner_reads_all" on public.league_members;
create policy "members_read_self_or_owner_reads_all"
  on public.league_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.leagues l
      where l.id = league_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "members_update_self" on public.league_members;
create policy "members_update_self"
  on public.league_members for update
  using (user_id = auth.uid());

drop policy if exists "owner_insert_members" on public.league_members;
create policy "owner_insert_members"
  on public.league_members for insert
  with check (
    exists (
      select 1 from public.leagues l
      where l.id = league_id and l.owner_id = auth.uid()
    )
  );

-- INVITES
drop policy if exists "invite_visible_to_inviter_or_invitee" on public.invites;
create policy "invite_visible_to_inviter_or_invitee"
  on public.invites for select
  using (
    invited_by = auth.uid()
    or lower(email::text) = lower(coalesce(auth.jwt()->>'email',''))
  );

drop policy if exists "owner_can_insert_invites" on public.invites;
create policy "owner_can_insert_invites"
  on public.invites for insert
  with check (
    exists (
      select 1 from public.leagues l
      where l.id = league_id and l.owner_id = auth.uid()
    )
  );
