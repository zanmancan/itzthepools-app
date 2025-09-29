-- v_leagues_mine + v_invites_mine (accepted_at) + owner RLS + revoke_invite RPC (text token)

-- === Views ================================================================

create or replace view public.v_leagues_mine as
  select l.id, l.name
  from public.leagues l
  where l.owner_id = auth.uid()
union
  select l.id, l.name
  from public.league_members m
  join public.leagues l on l.id = m.league_id
  where m.user_id = auth.uid() and m.role = 'owner';

create or replace view public.v_invites_mine as
  select
    i.token::text                               as token,
    i.email::text                               as email,
    i.league_id::uuid                           as league_id,
    l.name::text                                as league_name,
    extract(epoch from coalesce(i.expires_at, now() + interval '7 days'))::bigint * 1000 as expires_at,
    case
      when i.accepted_at is null then null
      else extract(epoch from i.accepted_at)::bigint * 1000
    end                                         as consumed_at
  from public.invites i
  join public.leagues l on l.id = i.league_id
  where
    l.owner_id = auth.uid()
    or exists (
      select 1
      from public.league_members m
      where m.league_id = i.league_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    );

comment on view public.v_leagues_mine is 'Leagues owned by the current user (by owner_id or league_members owner role).';
comment on view public.v_invites_mine is 'Invites for leagues owned by the current user; consumed_at maps to accepted_at.';

-- === RLS (owner-only) =====================================================

alter table public.leagues enable row level security;
alter table public.invites enable row level security;
alter table public.league_members enable row level security;

drop policy if exists leagues_owner_all on public.leagues;
create policy leagues_owner_all
  on public.leagues
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists league_members_owner_select on public.league_members;
create policy league_members_owner_select
  on public.league_members
  for select
  using (exists (
    select 1 from public.leagues l
    where l.id = league_members.league_id
      and l.owner_id = auth.uid()
  ));

drop policy if exists invites_owner_select on public.invites;
create policy invites_owner_select
  on public.invites
  for select
  using (exists (
    select 1 from public.leagues l
    where l.id = invites.league_id
      and l.owner_id = auth.uid()
  ) or exists (
    select 1 from public.league_members m
    join public.leagues l on l.id = m.league_id
    where m.league_id = invites.league_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ));

drop policy if exists invites_owner_insert on public.invites;
create policy invites_owner_insert
  on public.invites
  for insert
  with check (exists (
    select 1 from public.leagues l
    where l.id = league_id
      and l.owner_id = auth.uid()
  ) or exists (
    select 1 from public.league_members m
    join public.leagues l on l.id = m.league_id
    where m.league_id = league_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ));

drop policy if exists invites_owner_update on public.invites;
create policy invites_owner_update
  on public.invites
  for update
  using (exists (
    select 1 from public.leagues l
    where l.id = invites.league_id
      and l.owner_id = auth.uid()
  ) or exists (
    select 1 from public.league_members m
    join public.leagues l on l.id = m.league_id
    where m.league_id = invites.league_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ))
  with check (exists (
    select 1 from public.leagues l
    where l.id = league_id
      and l.owner_id = auth.uid()
  ) or exists (
    select 1 from public.league_members m
    join public.leagues l on l.id = m.league_id
    where m.league_id = league_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ));

drop policy if exists invites_owner_delete on public.invites;
create policy invites_owner_delete
  on public.invites
  for delete
  using (exists (
    select 1 from public.leagues l
    where l.id = invites.league_id
      and l.owner_id = auth.uid()
  ) or exists (
    select 1 from public.league_members m
    join public.leagues l on l.id = m.league_id
    where m.league_id = invites.league_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ));

-- === RPC for safe revoke ===================================================

-- Your invites.token is text (not uuid), so use TEXT parameter.
drop function if exists public.revoke_invite(text);
create or replace function public.revoke_invite(p_token text)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.invites i
  using public.leagues l
  where i.token::text = p_token
    and l.id = i.league_id
    and (
      l.owner_id = auth.uid()
      or exists (
        select 1 from public.league_members m
        where m.league_id = l.id
          and m.user_id = auth.uid()
          and m.role = 'owner'
      )
    );
end;
$$;

revoke all on function public.revoke_invite(text) from public;
grant execute on function public.revoke_invite(text) to authenticated;
