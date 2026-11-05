-- Donors could previously update any column of any wishlist item. They may now only
-- adopt an open gift for themselves or release one they adopted; everything else about
-- a gift stays with the family's nominator (or the dashboard).
alter policy "Users can adopt wishlist items" on public.wishlist_items
  using (is_adopted = false or adopted_by = (select auth.uid()))
  with check (
    (is_adopted = true and adopted_by = (select auth.uid()))
    or (is_adopted = false and adopted_by is null)
  );
alter policy "Users can adopt wishlist items" on public.wishlist_items
  rename to "Donors adopt open gifts and release their own";

-- RLS cannot limit which columns an update touches, so a trigger keeps donors' updates
-- to the adoption columns. Nominators and the dashboard (service role / postgres) are exempt.
create or replace function public.guard_wishlist_item_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if exists (
    select 1
    from public.family_members fm
    join public.families f on f.id = fm.family_id
    where fm.id = old.family_member_id and f.nominated_by = (select auth.uid())
  ) then
    return new;
  end if;

  if (new.id, new.family_member_id, new.category, new.description, new.color,
      new.size, new.link, new.details, new.created_at)
     is distinct from
     (old.id, old.family_member_id, old.category, old.description, old.color,
      old.size, old.link, old.details, old.created_at) then
    raise exception 'Only the nominating user can edit this gift'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_wishlist_item_update() from public, anon, authenticated;

create trigger guard_wishlist_item_update
  before update on public.wishlist_items
  for each row execute function public.guard_wishlist_item_update();

-- Donor names ("Adopted by ...") were readable without signing in; every page needs an account.
alter policy "Public profiles are viewable by everyone." on public.profiles
  to authenticated;
alter policy "Public profiles are viewable by everyone." on public.profiles
  rename to "Signed-in users can view profiles";

-- Trigger functions run without EXECUTE; nothing should call them through /rest/v1/rpc.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
