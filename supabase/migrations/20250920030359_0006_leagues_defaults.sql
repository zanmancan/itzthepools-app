-- 0006_leagues_defaults.sql
-- Give leagues.ruleset and leagues.season sane defaults so inserts can omit them.

-- Handle ruleset (text) => default 'standard'
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'leagues'
      and column_name  = 'ruleset'
  ) then
    -- backfill any NULLs first
    execute 'update public.leagues set ruleset = coalesce(ruleset, ''standard'')';
    -- add a default so future inserts work without passing ruleset
    execute 'alter table public.leagues alter column ruleset set default ''standard''';
    -- (optional) keep it not null to guarantee presence
    execute 'alter table public.leagues alter column ruleset set not null';
  end if;
end $$;

-- Handle season (text or integer) => default = current year
do $$
declare
  v_type text;
begin
  select data_type
  into v_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'leagues'
    and column_name  = 'season';

  if found then
    if v_type in ('integer', 'bigint', 'smallint') then
      -- numeric season (e.g., 2025)
      execute 'update public.leagues set season = coalesce(season, extract(year from now())::int)';
      execute 'alter table public.leagues alter column season set default extract(year from now())::int';
    else
      -- text season (e.g., '2025')
      execute 'update public.leagues set season = coalesce(season, to_char(now(), ''YYYY''))';
      execute 'alter table public.leagues alter column season set default to_char(now(), ''YYYY'')';
    end if;

    -- ensure not null after backfill
    execute 'alter table public.leagues alter column season set not null';
  end if;
end $$;
