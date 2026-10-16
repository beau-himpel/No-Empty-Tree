import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { WishItem } from './shared/types';
import { ToastService } from './shared/toast/toast.service';
import { SupabaseService } from './supabase.service';

// PostgREST "no rows returned" — the item was adopted by someone else first
const ALREADY_TAKEN_CODE = 'PGRST116';

/**
 * Single entry point for adopting and releasing wish list items.
 *
 * Family data is loaded once per page and mutated in place for instant feedback, so
 * anything derived from it (counts, progress) must read `version()` to stay current.
 */
@Injectable({ providedIn: 'root' })
export class AdoptionService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly _version = signal(0);
  readonly version = this._version.asReadonly();

  private readonly pendingIds = signal<ReadonlySet<string>>(new Set());

  isPending(itemId: string): boolean {
    return this.pendingIds().has(itemId);
  }

  isAdoptedByCurrentUser(item: WishItem): boolean {
    const user = this.authService.currentUser();
    return !!user && item.is_adopted && item.adopted_by === user.id;
  }

  /** Adopts every item that is still open. Resolves with how many were adopted. */
  async adopt(items: WishItem[], options: { quiet?: boolean } = {}): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) return 0;

    const targets = items.filter((item) => !item.is_adopted && !this.isPending(item.id));
    if (targets.length === 0) return 0;

    this.setPending(targets, true);
    const results = await Promise.allSettled(
      targets.map((item) => this.supabaseService.adoptWishlistItem(item.id, user.id))
    );

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

    this.setPending(targets, false);
    this._version.update((v) => v + 1);

    const failed = targets.length - adopted.length - takenByOthers;
    if (takenByOthers > 0 || failed > 0) {
      this.toast.error(this.failureMessage(adopted.length, takenByOthers, failed));
    } else if (!options.quiet) {
      if (adopted.length === 1) {
        const [item] = adopted;
        this.toast.show('Added to My Adoptions', {
          action: { label: 'Undo', run: () => this.unadopt(item, { quiet: true }) },
        });
      } else {
        this.toast.show(`${adopted.length} gifts added to My Adoptions`);
      }
    }

    return adopted.length;
  }

  async unadopt(item: WishItem, options: { quiet?: boolean } = {}): Promise<boolean> {
    if (!item.is_adopted || this.isPending(item.id)) return false;

    this.setPending([item], true);
    try {
      await this.supabaseService.unadoptWishlistItem(item.id);
      item.is_adopted = false;
      item.adopted_by = undefined;
      item.adopted_by_name = undefined;
      this._version.update((v) => v + 1);

      if (!options.quiet) {
        this.toast.show('Removed from My Adoptions', {
          action: { label: 'Undo', run: () => this.adopt([item], { quiet: true }) },
        });
      }
      return true;
    } catch {
      this.toast.error("Couldn't remove that gift. Please try again.");
      return false;
    } finally {
      this.setPending([item], false);
    }
  }

  private failureMessage(adopted: number, taken: number, failed: number): string {
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

  private setPending(items: WishItem[], pending: boolean): void {
    this.pendingIds.update((current) => {
      const next = new Set(current);
      items.forEach((item) => (pending ? next.add(item.id) : next.delete(item.id)));
      return next;
    });
  }
}
