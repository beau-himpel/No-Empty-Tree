-- Any signed-in account could read every family's address, phone and email. The app never
-- shows them; organizers read them from the dashboard. Nominators can still submit them.
-- Apply only after the app version that stops selecting these columns is deployed.
revoke select on table public.families from anon, authenticated;
grant select (id, last_name, nominated_by, season, created_at, updated_at)
  on public.families to authenticated;
