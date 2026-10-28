import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAdoptions } from '../../lib/adoption';
import { useAuth } from '../../lib/auth';
import { currentSeason } from '../../lib/nomination-settings';
import { getFamiliesWithMembers, getPurchasedItemIds, markPurchased, unmarkPurchased } from '../../lib/supabase';
import { titleCase } from '../../lib/text';
import { toast } from '../../lib/toast';
import type { Family } from '../../lib/types';
import { FamilyTab } from '../../shared/FamilyTab';
import { adoptedBy, giftCount, itemMeta, memberLine } from '../my-adoptions/adopted-by';
import './ShoppingList.css';

const STORAGE_PREFIX = 'net:shopping-list:';
const PENDING_PREFIX = 'net:shopping-list-pending:';

// Postgres "insufficient privilege", returned when row-level security rejects a write
const ROW_LEVEL_SECURITY_CODE = '42501';

/** Ticks not yet saved to the server: gift id -> bought. */
type PendingTicks = Record<string, boolean>;

function readBought(key: string): ReadonlySet<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function readPending(key: string): PendingTicks {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? '{}');
    return stored && typeof stored === 'object' && !Array.isArray(stored)
      ? (Object.fromEntries(Object.entries(stored).filter(([, value]) => typeof value === 'boolean')) as PendingTicks)
      : {};
  } catch {
    return {};
  }
}

function store(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or storage blocked: the server copy still has the ticks
  }
}

/** A link is printed as its site name, which is something you can actually type. */
function linkHost(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link;
  }
}

/**
 * Everything the signed-in user adopted, by family and then person, as a checklist to
 * shop from on a phone or to print. Ticks are saved to the donor's account
 * (gift_purchases) and mirrored on the device, so ticking is instant and keeps working
 * with no signal; changes made offline are sent when the connection is back.
 */
export default function ShoppingList() {
  const { user } = useAuth();
  const { version } = useAdoptions();
  const userId = user?.id ?? null;
  const storageKey = STORAGE_PREFIX + (userId ?? 'anonymous');
  const pendingKey = PENDING_PREFIX + (userId ?? 'anonymous');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);

  /** Ticked gift ids for whoever is signed in; starts from the device copy. */
  const [bought, setBoughtState] = useState(() => readBought(storageKey));
  /** Ticks made on this device that the server hasn't confirmed yet. */
  const [pending, setPendingState] = useState(() => readPending(pendingKey));
  /** The last attempt to reach the server failed, so ticks are only on this device for now. */
  const [syncProblem, setSyncProblem] = useState(false);

  // Latest values for the sync loop and Undo callbacks, which outlive a render
  const latest = useRef({ bought, pending, userId, storageKey, pendingKey });
  latest.current.userId = userId;
  latest.current.storageKey = storageKey;
  latest.current.pendingKey = pendingKey;
  const isSyncing = useRef(false);

  const setBought = useCallback((ids: ReadonlySet<string>) => {
    latest.current.bought = ids;
    setBoughtState(ids);
    store(latest.current.storageKey, ids.size === 0 ? null : [...ids]);
  }, []);

  const setPending = useCallback((ticks: PendingTicks) => {
    latest.current.pending = ticks;
    setPendingState(ticks);
    store(latest.current.pendingKey, Object.keys(ticks).length === 0 ? null : ticks);
  }, []);

  // Someone else signed in: switch to their device copy
  const loadedKey = useRef(storageKey);
  useEffect(() => {
    if (loadedKey.current === storageKey) return;
    loadedKey.current = storageKey;
    latest.current.bought = readBought(storageKey);
    latest.current.pending = readPending(pendingKey);
    setBoughtState(latest.current.bought);
    setPendingState(latest.current.pending);
  }, [storageKey, pendingKey]);

  /**
   * Sends queued ticks one at a time. A tick that changes again while its request is in
   * flight stays queued and is sent with its newest value.
   */
  const sync = useCallback(async () => {
    const id = latest.current.userId;
    if (isSyncing.current || !id) return;
    isSyncing.current = true;
    try {
      let next: [string, boolean] | undefined;
      while ((next = Object.entries(latest.current.pending)[0])) {
        const [itemId, isBought] = next;
        try {
          if (isBought) await markPurchased(itemId, id);
          else await unmarkPurchased(itemId, id);
        } catch (syncError) {
          // Refused rather than unreachable (e.g. the gift is no longer adopted by this
          // donor): retrying can never succeed, so drop it. Anything else stops and retries later.
          if ((syncError as { code?: string })?.code !== ROW_LEVEL_SECURITY_CODE) throw syncError;
        }
        if (latest.current.pending[itemId] === isBought) {
          const { [itemId]: _sent, ...rest } = latest.current.pending;
          setPending(rest);
        }
      }
      setSyncProblem(false);
    } catch {
      setSyncProblem(true);
    } finally {
      isSyncing.current = false;
    }
  }, [setPending]);

  useEffect(() => {
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [sync]);

  /** The server's ticks, with anything ticked offline on this device laid on top. */
  const loadSavedTicks = useCallback(async () => {
    try {
      const saved = new Set(await getPurchasedItemIds());
      for (const [id, isBought] of Object.entries(latest.current.pending)) {
        if (isBought) saved.add(id);
        else saved.delete(id);
      }
      setBought(saved);
      setSyncProblem(false);
      sync();
    } catch {
      // Keep the device copy; the list still works and syncs on the next tick or reload
      setSyncProblem(true);
    }
  }, [setBought, sync]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data] = await Promise.all([currentSeason().then(getFamiliesWithMembers), loadSavedTicks()]);
      setFamilies(data);
    } catch {
      setError("We couldn't load your adoptions. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [loadSavedTicks]);

  useEffect(() => {
    load();
  }, [load]);

  const queue = (changes: PendingTicks) => {
    setPending({ ...latest.current.pending, ...changes });
    sync();
  };

  const toggle = (itemId: string) => {
    const next = new Set(latest.current.bought);
    const isBought = !next.has(itemId);
    if (isBought) next.add(itemId);
    else next.delete(itemId);
    setBought(next);
    queue({ [itemId]: isBought });
  };

  const clearBought = () => {
    const previous = latest.current.bought;
    setBought(new Set());
    queue(Object.fromEntries([...previous].map((id) => [id, false])));
    // Clearing reaches every device, so make it easy to take back
    toast.show('Ticks cleared', {
      action: {
        label: 'Undo',
        run: () => {
          setBought(new Set([...latest.current.bought, ...previous]));
          queue(Object.fromEntries([...previous].map((id) => [id, true])));
        },
      },
    });
  };

  /** Families A–Z; people stay in the order the family was nominated, as elsewhere in the app. */
  // Adoptions mutate items in place; version is what marks the list as stale
  const adoptedFamilies = useMemo(
    () =>
      adoptedBy(families, user?.id).sort((a, b) =>
        a.last_name.localeCompare(b.last_name, undefined, { sensitivity: 'base' })
      ),
    [families, user, version]
  );

  const totals = useMemo(() => {
    const ids = new Set(
      adoptedFamilies.flatMap((f) => f.family_members.flatMap((m) => (m.wishlist_items || []).map((i) => i.id)))
    );
    const boughtCount = [...bought].filter((id) => ids.has(id)).length;
    const gifts = giftCount(adoptedFamilies);
    return {
      gifts,
      families: adoptedFamilies.length,
      bought: boughtCount,
      progressPct: gifts === 0 ? 0 : (boughtCount / gifts) * 100,
    };
  }, [adoptedFamilies, bought]);

  const hasUnsyncedTicks = Object.keys(pending).length > 0;

  return (
    <section className="mx-auto w-full max-w-3xl">
      <Link
        to="/my-adoptions"
        viewTransition
        className="-ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 active:scale-95 print:hidden"
      >
        <i className="pi pi-chevron-left text-xs" aria-hidden="true" />
        My Adoptions
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-page-title">Shopping list</h1>
          {!isLoading && totals.gifts > 0 && (
            <p className="mt-2 text-[0.9375rem] text-stone-500 tabular-nums">
              {totals.gifts} {totals.gifts === 1 ? 'gift' : 'gifts'} for {totals.families}{' '}
              {totals.families === 1 ? 'family' : 'families'}
            </p>
          )}
        </div>
        {!isLoading && totals.gifts > 0 && (
          <button type="button" className="btn-dark btn-sm print:hidden" onClick={() => window.print()}>
            <i className="pi pi-print text-sm" aria-hidden="true" />
            Print
          </button>
        )}
      </div>

      {isLoading ? (
        <>
          <div className="mt-10 animate-pulse space-y-4" aria-hidden="true">
            {[1, 2, 3, 4].map((placeholder) => (
              <div key={placeholder} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-md bg-stone-100" />
                <div className="h-4 w-1/2 rounded bg-stone-100" />
              </div>
            ))}
          </div>
          <span className="sr-only" role="status">
            Loading your shopping list…
          </span>
        </>
      ) : error ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-berry-50 p-4 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
          <div className="flex items-center gap-3">
            <i className="pi pi-exclamation-circle text-berry-600" aria-hidden="true" />
            <span className="text-sm font-medium text-berry-800">{error}</span>
          </div>
          <button type="button" className="btn-outline btn-sm self-start sm:self-auto" onClick={load}>
            <i className="pi pi-refresh text-xs" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : totals.gifts === 0 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center animate-fade-up">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pine-50">
            <i className="pi pi-list-check text-2xl text-pine-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-snug text-stone-900">Nothing to shop for yet</p>
            <p className="mt-1 text-sm text-stone-500">Gifts you adopt will show up here as a checklist.</p>
          </div>
          <Link to="/adopt-family" viewTransition className="btn-adopt">
            Browse families
          </Link>
        </div>
      ) : (
        <>
          {/* Progress (on screen only; paper gets its own ticks) */}
          <div className="mt-6 animate-fade-up print:hidden">
            <div className="h-1 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-pine-600 transition-[width] duration-500 ease-out"
                style={{ width: `${totals.progressPct}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-sm font-medium tabular-nums">
              <span className="text-pine-700" aria-live="polite">
                {totals.bought} of {totals.gifts} bought
              </span>
              {totals.bought > 0 && (
                <button
                  type="button"
                  className="text-sm font-semibold text-stone-500 hover:text-stone-900"
                  onClick={clearBought}
                >
                  Clear ticks
                </button>
              )}
            </div>
            {syncProblem && hasUnsyncedTicks && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-stone-500 animate-fade-in" role="status">
                <i className="pi pi-cloud-upload mt-[0.3rem] text-xs" aria-hidden="true" />
                Saved on this device. We'll sync your ticks when you're back online.
              </p>
            )}
          </div>

          <div className="mt-10 space-y-10 print:mt-6 print:space-y-6">
            {adoptedFamilies.map((family, i) => (
              <section
                key={family.id}
                className="animate-fade-up"
                style={{ animationDelay: `${60 + i * 60}ms` }}
                aria-labelledby={`list-family-${family.id}`}
              >
                <h2 id={`list-family-${family.id}`} className="list-family">
                  <FamilyTab>The {titleCase(family.last_name)} Family</FamilyTab>
                </h2>

                {family.family_members.map((member) => (
                  <div key={member.id} className="list-member pt-5 print:pt-3">
                    <h3 className="list-member-name flex items-baseline gap-2">
                      <span className="text-[1.0625rem] font-semibold tracking-snug text-stone-900">
                        {titleCase(member.first_name)}
                      </span>
                      <span className="text-sm text-stone-500">{memberLine(member)}</span>
                    </h3>
                    <ul className="mt-1 divide-y divide-stone-100">
                      {(member.wishlist_items || []).map((item) => {
                        const isBought = bought.has(item.id);
                        return (
                          <li key={item.id} className="list-item">
                            <label className="flex cursor-pointer items-start gap-3.5 py-3 print:py-2">
                              <input
                                type="checkbox"
                                className="list-check mt-0.5 shrink-0"
                                checked={isBought}
                                onChange={() => toggle(item.id)}
                              />
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block text-[0.9375rem] font-semibold leading-snug tracking-snug transition-colors ${
                                    isBought ? 'text-stone-400 line-through' : 'text-stone-900'
                                  }`}
                                >
                                  {item.description}
                                </span>
                                {itemMeta(item) && (
                                  <span className="block text-sm text-stone-500">{itemMeta(item)}</span>
                                )}
                                {item.details && (
                                  <span className="mt-0.5 block text-sm leading-relaxed text-stone-500">
                                    {item.details}
                                  </span>
                                )}
                                {item.link && (
                                  <span className="mt-0.5 block text-sm">
                                    <a
                                      href={item.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 font-semibold text-pine-700 hover:text-pine-800 hover:underline print:hidden"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      View item
                                      <i className="pi pi-arrow-up-right text-[0.6875rem]" aria-hidden="true" />
                                    </a>
                                    <span className="hidden text-stone-500 print:inline">{linkHost(item.link)}</span>
                                  </span>
                                )}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
