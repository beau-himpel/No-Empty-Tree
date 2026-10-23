-- Which season's families the app shows and new nominations are filed under.
alter table public.nomination_settings
  add column if not exists active_season smallint not null default extract(year from now())::smallint;
comment on column public.nomination_settings.active_season is
  'Season (year) shown for adoption and used for new nominations. Change it to start a new year.';
