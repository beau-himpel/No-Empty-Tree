-- Optional ethnicity for each nominated family member, entered on the nomination form.
-- Not shown on the adoption pages; the app only writes it when a value was entered.
alter table public.family_members
  add column if not exists ethnicity text;

alter table public.family_members
  drop constraint if exists family_members_ethnicity_length;

alter table public.family_members
  add constraint family_members_ethnicity_length
  check (ethnicity is null or char_length(ethnicity) <= 100);

comment on column public.family_members.ethnicity is
  'Optional, free text from the nomination form (max 100 characters). Not displayed to adopters.';
