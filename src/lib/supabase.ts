import { createClient } from '@supabase/supabase-js';
import { environment } from './environment';
import { createStore } from './store';
import type { Family } from './types';

/** Storage that survives NavigatorLockAcquireTimeoutError by falling back to sessionStorage. */
function storageCall<T>(action: string, primary: () => T, fallback: () => T, empty: T): T {
  try {
    return primary();
  } catch (error) {
    if ((error as { name?: string })?.name === 'NavigatorLockAcquireTimeoutError') {
      console.warn(`NavigatorLockAcquireTimeoutError - ${action} via sessionStorage`);
      try {
        return fallback();
      } catch (sessionError) {
        console.warn('SessionStorage also failed:', sessionError);
        return empty;
      }
    }
    console.warn(`Failed to ${action} in localStorage:`, error);
    return empty;
  }
}

export const supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-auth-token',
    storage: {
      getItem: (key) =>
        storageCall('get item', () => localStorage.getItem(key), () => sessionStorage.getItem(key), null),
      setItem: (key, value) =>
        storageCall('set item', () => localStorage.setItem(key, value), () => sessionStorage.setItem(key, value), undefined),
      removeItem: (key) =>
        storageCall('remove item', () => localStorage.removeItem(key), () => sessionStorage.removeItem(key), undefined),
    },
  },
});

/** True after arriving from a "reset your password" email link. */
export const passwordRecovery = createStore(
  typeof window !== 'undefined' && /(^|[#&?])type=recovery\b/.test(window.location.hash)
);

// Registered synchronously after client creation: this is the only subscriber
// guaranteed to receive PASSWORD_RECOVERY, which fires while the client
// processes a reset link during startup.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') passwordRecovery.set(true);
});

const FAMILY_COLUMNS = `
  id,
  last_name,
  address,
  phone,
  email,
  nominated_by,
  season,
  created_at,
  updated_at,
  family_members (
    id,
    family_id,
    first_name,
    age,
    sex,
    is_parent,
    created_at,
    updated_at,
    wishlist_items (
      id,
      family_member_id,
      category,
      description,
      color,
      size,
      is_adopted,
      adopted_by,
      adopted_by_name:profiles!wishlist_items_adopted_by_fkey(full_name),
      link,
      details,
      created_at,
      updated_at
    )
  )
`;

function familiesQuery() {
  return supabase.from('families').select(FAMILY_COLUMNS);
}

async function familiesWithMembers(
  filter: (query: ReturnType<typeof familiesQuery>) => ReturnType<typeof familiesQuery>
): Promise<Family[]> {
  const { data, error } = await filter(familiesQuery()).order('last_name');
  if (error) throw error;

  const families = (data ?? []) as unknown as Family[];
  families.forEach((family) => family.family_members?.sort((a, b) => b.age - a.age));
  return families;
}

/** Families of one Christmas season (year), with their members and wish lists. */
export function getFamiliesWithMembers(season: number): Promise<Family[]> {
  return familiesWithMembers((query) => query.eq('season', season));
}

/** Every family from seasons before this one (newest first), for past adoptions. */
export function getFamiliesBeforeSeason(season: number): Promise<Family[]> {
  return familiesWithMembers((query) => query.lt('season', season).order('season', { ascending: false }));
}

export async function createFamily(familyData: {
  last_name: string;
  address: string;
  phone?: string;
  email?: string;
  nominated_by?: string;
  season: number;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.from('families').insert(familyData).select().single();
  if (error) throw error;
  return data;
}

export async function addFamilyMember(memberData: {
  family_id: string;
  first_name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  is_parent: boolean;
  ethnicity?: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.from('family_members').insert(memberData).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFamily(familyId: string): Promise<void> {
  const { error } = await supabase.from('families').delete().eq('id', familyId);
  if (error) throw error;
}

export async function addWishlistItem(itemData: {
  family_member_id: string;
  category: string;
  description: string;
  color?: string;
  size?: string;
  link?: string;
  details?: string;
}): Promise<void> {
  const { error } = await supabase.from('wishlist_items').insert(itemData).select().single();
  if (error) throw error;
}

export async function adoptWishlistItem(itemId: string, adoptedBy: string): Promise<void> {
  const { error } = await supabase
    .from('wishlist_items')
    .update({ is_adopted: true, adopted_by: adoptedBy })
    .eq('id', itemId)
    // Never take over an item someone else adopted after this page loaded
    .eq('is_adopted', false)
    .select()
    .single();
  if (error) throw error;
}

export async function unadoptWishlistItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('wishlist_items')
    .update({ is_adopted: false, adopted_by: null })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
}

/** Ids of the gifts the signed-in donor has ticked as bought (row-level security limits it to theirs). */
export async function getPurchasedItemIds(): Promise<string[]> {
  const { data, error } = await supabase.from('gift_purchases').select('wishlist_item_id');
  if (error) throw error;
  return (data ?? []).map((row) => row.wishlist_item_id as string);
}

export async function markPurchased(itemId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('gift_purchases')
    // Ticking twice (e.g. a retry after a dropped response) is not an error
    .upsert(
      { user_id: userId, wishlist_item_id: itemId },
      { onConflict: 'user_id,wishlist_item_id', ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function unmarkPurchased(itemId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('gift_purchases')
    .delete()
    .eq('user_id', userId)
    .eq('wishlist_item_id', itemId);
  if (error) throw error;
}
