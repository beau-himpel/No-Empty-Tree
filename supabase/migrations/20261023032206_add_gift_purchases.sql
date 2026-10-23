-- Gifts a donor has ticked off on their shopping list ("bought").
-- Private to each donor: nobody else, including other donors, can read or change them.
-- A row is just the pair; removing it un-ticks the gift. Row-level security is on, and
-- the policies that let donors use the table follow in the next three migrations.
create table if not exists public.gift_purchases (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  wishlist_item_id uuid not null references public.wishlist_items (id) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (user_id, wishlist_item_id)
);
comment on table public.gift_purchases is
  'Shopping list ticks: gifts a donor has marked as bought. Readable and writable only by that donor.';
-- Look up which donors ticked an item when it is deleted (cascade) without a full scan
create index if not exists gift_purchases_wishlist_item_id_idx on public.gift_purchases (wishlist_item_id);
alter table public.gift_purchases enable row level security;
