-- 0003_core_schema.sql (idempotent)
-- Core app objects (leagues, league_members, invites, RPC)

-- Ensure extension (safe if already present)
create extension if not exists "pgcrypto" with schema extensions;

-- =========================
-- LEAGUES
-- =========================
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sport text not null,
  created_at timestamptz not null default now()
);
alter table public.leagues enable row level security;

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

-- =========================
-- LEAGUE MEMBERS
-- =========================
create table if not exists public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  team_name text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
alter table public.league_members enable row level security;

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

create index if not exists idx_league_members_user on public.league_members(user_id);
create index if not exists idx_league_members_league on public.league_members(league_id);

-- =========================
-- INVITES  (align existing table first)
-- =========================
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  league_id uuid,
  email text,
  token text unique,
  invited_by uuid,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

-- If invites already existed with a different shape, ensure required columns exist
alter table public.invites add column if not exists league_id uuid;
alter table public.invites add column if not exists email text;
alter table public.invites add column if not exists token text;
alter table public.invites add column if not exists invited_by uuid;
alter table public.invites add column if not exists accepted boolean not null default false;
alter table public.invites add column if not exists created_at timestamptz not null default now();

-- Optional indexes (safe if repeated)
create index if not exists idx_invites_email on public.invites(email);
create index if not exists idx_invites_league on public.invites(league_id);
create index if not exists idx_invites_token on public.invites(token);

alter table public.invites enable row level security;

drop policy if exists "invite_visible_to_inviter_or_invitee" on public.invites;
create policy "invite_visible_to_inviter_or_invitee"
  on public.invites for select
  using (
    (invited_by is not null and invited_by = auth.uid())
    or lower(email) = lower(coalesce(auth.jwt()->>'email',''))
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

-- =========================
-- RPC: accept_invite(token)
-- =========================
-- Drop any older version first (e.g., one that returned VOID)
drop function if exists public.accept_invite(text);

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_league uuid;
  v_email  text;
begin
  v_email := coalesce(auth.jwt()->>'email', null);
  if v_email is null then
    raise exception 'no-email-on-jwt';
  end if;

  select league_id
    into v_league
  from public.invites
  where token = p_token
    and accepted = false
    and lower(email) = lower(v_email)
  for update;

  if not found then
    raise exception 'invalid-or-used-invite';
  end if;

  insert into public.league_members (league_id, user_id)
  values (v_league, auth.uid())
  on conflict do nothing;

  update public.invites
  set accepted = true
  where token = p_token;

  return v_league;
end
$fn$;

grant execute on function public.accept_invite(text) to authenticated;
