-- Leagues: add sport column if it’s missing, backfill, then enforce NOT NULL

alter table public.leagues
  add column if not exists sport text;

-- Backfill any existing rows that would otherwise violate NOT NULL
update public.leagues
set sport = coalesce(sport, 'dev_sport');

-- Enforce NOT NULL now that every row has a value
alter table public.leagues
  alter column sport set not null;
