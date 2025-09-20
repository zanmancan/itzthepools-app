-- 0005_rls_helpers_break_cycle.sql
-- Break mutual recursion by using security-definer helpers.

-- Helper: is the user a member of this league?
create or replace function public.is_league_member(
  p_league uuid,
  p_user   uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.league_members
    where league_id = p_league
      and user_id   = p_user
  );
$$;

grant execute on function public.is_league_member(uuid, uuid) to authenticated;

-- Helper: is the user the owner of this league?
create or replace function public.is_league_owner(
  p_league uuid,
  p_user   uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.leagues
    where id       = p_league
      and owner_id = p_user
  );
$$;

grant execute on function public.is_league_owner(uuid, uuid) to authenticated;

-- Recreate policies to use the helpers (no cross-table subqueries).

-- leagues: members or owner can read
drop policy if exists "leagues_member_or_owner_can_read" on public.leagues;
create policy "leagues_member_or_owner_can_read"
  on public.leagues for select
  using (
    owner_id = auth.uid()
    or public.is_league_member(id, auth.uid())
  );

-- league_members: owner reads all; member reads own row
drop policy if exists "members_read_self_or_owner_reads_all" on public.league_members;
create policy "members_read_self_or_owner_reads_all"
  on public.league_members for select
  using (
    user_id = auth.uid()
    or public.is_league_owner(league_id, auth.uid())
  );
