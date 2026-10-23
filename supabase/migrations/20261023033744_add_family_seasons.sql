-- The Christmas season (year) a family was nominated for; the app shows only the active one.
alter table public.families add column if not exists season smallint;
update public.families set season = extract(year from coalesce(created_at, now()))::smallint where season is null;
alter table public.families alter column season set default extract(year from now())::smallint;
alter table public.families alter column season set not null;
create index if not exists families_season_idx on public.families (season);
comment on column public.families.season is 'Christmas season (year) this family was nominated for.';
