import { currentUser } from './auth';
import { createStore, useStore } from './store';
import { adoptWishlistItem, unadoptWishlistItem } from './supabase';
import { toast } from './toast';
import type { WishItem } from './types';

// PostgREST "no rows returned" — the item was adopted by someone else first
const ALREADY_TAKEN_CODE = 'PGRST116';

interface AdoptionState {
  /** Bumped after every change, so anything derived from family data recomputes. */
  version: number;
  pendingIds: ReadonlySet<string>;
}

const state = createStore<AdoptionState>({ version: 0, pendingIds: new Set() });

/**
 * Re-renders the caller whenever an adoption changes. Family data is loaded once per
 * page and mutated in place for instant feedback, so anything derived from it (counts,
 * progress) must depend on the returned `version` to stay current.
 */
export function useAdoptions(): AdoptionState {
  return useStore(state);
}

function isPending(itemId: string): boolean {
  return state.get().pendingIds.has(itemId);
}

export function isAdoptedByCurrentUser(item: WishItem): boolean {
  const user = currentUser();
  return !!user && item.is_adopted && item.adopted_by === user.id;
}

function setPending(items: WishItem[], pending: boolean): void {
  state.set((current) => {
    const next = new Set(current.pendingIds);
    items.forEach((item) => (pending ? next.add(item.id) : next.delete(item.id)));
    return { ...current, pendingIds: next };
  });
}

function bumpVersion(): void {
  state.set((current) => ({ ...current, version: current.version + 1 }));
}

function failureMessage(adopted: number, taken: number, failed: number): string {
  if (adopted === 0 && failed === 0) {
    return taken === 1
      ? 'Someone else just adopted that gift.'
      : `Someone else just adopted ${taken} of those gifts.`;
  }
  if (adopted === 0) {
    return failed === 1
      ? "Couldn't adopt that gift. Please try again."
      : `Couldn't adopt ${failed} gifts. Please try again.`;
  }
  const missed = taken + failed;
  return `${adopted} adopted, but ${missed} ${missed === 1 ? "wasn't" : "weren't"} available. Please check the list.`;
}

/** Adopts every item that is still open. Resolves with how many were adopted. */
export async function adopt(items: WishItem[], options: { quiet?: boolean } = {}): Promise<number> {
  const user = currentUser();
  if (!user) return 0;

  const targets = items.filter((item) => !item.is_adopted && !isPending(item.id));
  if (targets.length === 0) return 0;

  setPending(targets, true);
  const results = await Promise.allSettled(targets.map((item) => adoptWishlistItem(item.id, user.id)));

  const adopted: WishItem[] = [];
  let takenByOthers = 0;
  results.forEach((result, index) => {
    const item = targets[index];
    if (result.status === 'fulfilled') {
      item.is_adopted = true;
      item.adopted_by = user.id;
      item.adopted_by_name = { full_name: user.user_metadata?.['full_name'] ?? '' };
      adopted.push(item);
    } else if (result.reason?.code === ALREADY_TAKEN_CODE) {
      item.is_adopted = true;
      item.adopted_by = undefined;
      item.adopted_by_name = undefined;
      takenByOthers++;
    }
  });

  setPending(targets, false);
  bumpVersion();

  const failed = targets.length - adopted.length - takenByOthers;
  if (takenByOthers > 0 || failed > 0) {
    toast.error(failureMessage(adopted.length, takenByOthers, failed));
  } else if (!options.quiet) {
    if (adopted.length === 1) {
      const [item] = adopted;
      toast.show('Added to My Adoptions', {
        action: { label: 'Undo', run: () => unadopt(item, { quiet: true }) },
      });
    } else {
      toast.show(`${adopted.length} gifts added to My Adoptions`);
    }
  }

  return adopted.length;
}

export async function unadopt(item: WishItem, options: { quiet?: boolean } = {}): Promise<boolean> {
  if (!item.is_adopted || isPending(item.id)) return false;

  setPending([item], true);
  try {
    await unadoptWishlistItem(item.id);
    item.is_adopted = false;
    item.adopted_by = undefined;
    item.adopted_by_name = undefined;
    bumpVersion();

    if (!options.quiet) {
      toast.show('Removed from My Adoptions', {
        action: { label: 'Undo', run: () => adopt([item], { quiet: true }) },
      });
    }
    return true;
  } catch {
    toast.error("Couldn't remove that gift. Please try again.");
    return false;
  } finally {
    setPending([item], false);
  }
}
