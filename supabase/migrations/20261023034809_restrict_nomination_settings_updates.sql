-- Only the project owner (dashboard / SQL editor, which bypass RLS) changes these settings;
-- the app only reads them. Previously any signed-in user could change them through the API.
alter policy "Allow authenticated users to update nomination settings" on public.nomination_settings
  using (false) with check (false);
alter policy "Allow authenticated users to update nomination settings" on public.nomination_settings
  rename to "Settings are changed only from the Supabase dashboard";
