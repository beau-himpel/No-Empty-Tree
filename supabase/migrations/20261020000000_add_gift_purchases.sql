-- Gifts a donor has ticked off on their shopping list ("bought").
-- Private to each donor: nobody else, including other donors, can read or change them.
-- A row is just the pair; removing it un-ticks the gift.
create table if not exists public.gift_purchases (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  wishlist_item_id uuid not null references public.wishlist_items (id) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (user_id, wishlist_item_id)
);

comment on table public.gift_purchases is
  'Shopping list ticks: gifts a donor has marked as bought. Readable and writable only by that donor.';

-- Look up which donors ticked an item when it is deleted (cascade) without a full scan
create index if not exists gift_purchases_wishlist_item_id_idx
  on public.gift_purchases (wishlist_item_id);

alter table public.gift_purchases enable row level security;

drop policy if exists "Donors read their own purchases" on public.gift_purchases;
create policy "Donors read their own purchases"
  on public.gift_purchases for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Only gifts the donor currently has adopted can be ticked
drop policy if exists "Donors tick gifts they adopted" on public.gift_purchases;
create policy "Donors tick gifts they adopted"
  on public.gift_purchases for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.wishlist_items w
      where w.id = wishlist_item_id
        and w.adopted_by = (select auth.uid())
    )
  );

drop policy if exists "Donors un-tick their own purchases" on public.gift_purchases;
create policy "Donors un-tick their own purchases"
  on public.gift_purchases for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.gift_purchases to authenticated;
