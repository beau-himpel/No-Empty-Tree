-- Only gifts the donor currently has adopted can be ticked
create policy "Donors tick gifts they adopted" on public.gift_purchases
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.wishlist_items w
                where w.id = wishlist_item_id and w.adopted_by = (select auth.uid())));
