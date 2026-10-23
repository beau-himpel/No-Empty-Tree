create policy "Donors un-tick their own purchases" on public.gift_purchases
  for delete to authenticated using (user_id = (select auth.uid()));
