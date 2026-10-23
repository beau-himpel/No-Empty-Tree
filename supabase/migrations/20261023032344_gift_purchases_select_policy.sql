create policy "Donors read their own purchases" on public.gift_purchases
  for select to authenticated using (user_id = (select auth.uid()));
