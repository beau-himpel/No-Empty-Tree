import { TitleCasePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, linkedSignal, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdoptionService } from '../../adoption.service';
import { AuthService } from '../../auth.service';
import { FamilyTabComponent } from '../../shared/family-tab.component';
import { roleLabel } from '../../shared/person-badge.component';
import { ToastService } from '../../shared/toast/toast.service';
import { Family, FamilyMember, WishItem } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';
import { adoptedBy, giftCount } from '../my-adoptions/adopted-by';

const STORAGE_PREFIX = 'net:shopping-list:';
const PENDING_PREFIX = 'net:shopping-list-pending:';

// Postgres "insufficient privilege", returned when row-level security rejects a write
const ROW_LEVEL_SECURITY_CODE = '42501';

/** Ticks not yet saved to the server: gift id -> bought. */
type PendingTicks = Record<string, boolean>;

/**
 * Everything the signed-in user adopted, by family and then person, as a checklist to
 * shop from on a phone or to print. Ticks are saved to the donor's account
 * (gift_purchases) and mirrored on the device, so ticking is instant and keeps working
 * with no signal; changes made offline are sent when the connection is back.
 */
@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [RouterLink, TitleCasePipe, FamilyTabComponent],
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.scss'],
})
export class ShoppingListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adoptionService = inject(AdoptionService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  private readonly families = signal<Family[]>([]);

  /** Families A–Z; people stay in the order the family was nominated, as elsewhere in the app. */
  readonly adoptedFamilies = computed(() => {
    this.adoptionService.version();
    return adoptedBy(this.families(), this.authService.currentUser()?.id).sort((a, b) =>
      a.last_name.localeCompare(b.last_name, undefined, { sensitivity: 'base' })
    );
  });

  private readonly userId = computed(() => this.authService.currentUser()?.id ?? null);
  private readonly storageKey = computed(() => STORAGE_PREFIX + (this.userId() ?? 'anonymous'));
  private readonly pendingKey = computed(() => PENDING_PREFIX + (this.userId() ?? 'anonymous'));
  /** Ticked gift ids, reloaded for whoever is signed in; starts from the device copy. */
  readonly bought = linkedSignal<ReadonlySet<string>>(() => this.readBought(this.storageKey()));
  /** Ticks made on this device that the server hasn't confirmed yet. */
  private readonly pending = linkedSignal<PendingTicks>(() => this.readPending(this.pendingKey()));
  /** The last attempt to reach the server failed, so ticks are only on this device for now. */
  readonly syncProblem = signal(false);
  readonly hasUnsyncedTicks = computed(() => Object.keys(this.pending()).length > 0);
  private isSyncing = false;

  readonly totals = computed(() => {
    const families = this.adoptedFamilies();
    const ids = new Set(families.flatMap((f) => f.family_members.flatMap((m) => (m.wishlist_items || []).map((i) => i.id))));
    const bought = [...this.bought()].filter((id) => ids.has(id)).length;
    const gifts = giftCount(families);
    return {
      gifts,
      families: families.length,
      bought,
      progressPct: gifts === 0 ? 0 : (bought / gifts) * 100,
    };
  });

  constructor() {
    const retry = () => this.sync();
    window.addEventListener('online', retry);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('online', retry));
  }

  ngOnInit() {
    this.load();
  }

  async load() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const [familiesData] = await Promise.all([
        this.supabaseService.getFamiliesWithMembers(),
        this.loadSavedTicks(),
      ]);
      this.families.set((familiesData ?? []) as unknown as Family[]);
    } catch {
      this.error.set("We couldn't load your adoptions. Check your connection and try again.");
    } finally {
      this.isLoading.set(false);
    }
  }

  /** The server's ticks, with anything ticked offline on this device laid on top. */
  private async loadSavedTicks() {
    try {
      const saved = new Set(await this.supabaseService.getPurchasedItemIds());
      for (const [id, isBought] of Object.entries(this.pending())) {
        if (isBought) saved.add(id);
        else saved.delete(id);
      }
      this.setBought(saved);
      this.syncProblem.set(false);
      this.sync();
    } catch {
      // Keep the device copy; the list still works and syncs on the next tick or reload
      this.syncProblem.set(true);
    }
  }

  isBought(item: WishItem): boolean {
    return this.bought().has(item.id);
  }

  toggle(item: WishItem) {
    const next = new Set(this.bought());
    const isBought = !next.has(item.id);
    if (isBought) next.add(item.id);
    else next.delete(item.id);
    this.setBought(next);
    this.queue({ [item.id]: isBought });
  }

  clearBought() {
    const previous = this.bought();
    this.setBought(new Set());
    this.queue(Object.fromEntries([...previous].map((id) => [id, false])));
    // Clearing reaches every device, so make it easy to take back
    this.toast.show('Ticks cleared', {
      action: {
        label: 'Undo',
        run: () => {
          this.setBought(new Set([...this.bought(), ...previous]));
          this.queue(Object.fromEntries([...previous].map((id) => [id, true])));
        },
      },
    });
  }

  private queue(changes: PendingTicks) {
    this.setPending({ ...this.pending(), ...changes });
    this.sync();
  }

  /**
   * Sends queued ticks one at a time. A tick that changes again while its request is in
   * flight stays queued and is sent with its newest value.
   */
  private async sync() {
    const userId = this.userId();
    if (this.isSyncing || !userId) return;
    this.isSyncing = true;
    try {
      let next: [string, boolean] | undefined;
      while ((next = Object.entries(this.pending())[0])) {
        const [id, isBought] = next;
        try {
          if (isBought) await this.supabaseService.markPurchased(id, userId);
          else await this.supabaseService.unmarkPurchased(id, userId);
        } catch (error) {
          // Refused rather than unreachable (e.g. the gift is no longer adopted by this
          // donor): retrying can never succeed, so drop it. Anything else stops and retries later.
          if ((error as { code?: string })?.code !== ROW_LEVEL_SECURITY_CODE) throw error;
        }
        if (this.pending()[id] === isBought) {
          const { [id]: _sent, ...rest } = this.pending();
          this.setPending(rest);
        }
      }
      this.syncProblem.set(false);
    } catch {
      this.syncProblem.set(true);
    } finally {
      this.isSyncing = false;
    }
  }

  print() {
    window.print();
  }

  memberLine(member: FamilyMember): string {
    const age = member.age === 0 ? 'under 1' : String(member.age);
    return `${roleLabel(member.is_parent, member.sex)}, ${age}`;
  }

  itemMeta(item: WishItem): string {
    return [item.category, item.color, item.size ? `Size ${item.size}` : null]
      .filter(Boolean)
      .join(' · ');
  }

  /** A link is printed as its site name, which is something you can actually type. */
  linkHost(link: string): string {
    try {
      return new URL(link).hostname.replace(/^www\./, '');
    } catch {
      return link;
    }
  }

  private readBought(key: string): Set<string> {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '[]');
      return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []);
    } catch {
      return new Set();
    }
  }

  private setBought(ids: ReadonlySet<string>) {
    this.bought.set(ids);
    this.store(this.storageKey(), ids.size === 0 ? null : [...ids]);
  }

  private setPending(ticks: PendingTicks) {
    this.pending.set(ticks);
    this.store(this.pendingKey(), Object.keys(ticks).length === 0 ? null : ticks);
  }

  private readPending(key: string): PendingTicks {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '{}');
      return stored && typeof stored === 'object' && !Array.isArray(stored)
        ? Object.fromEntries(Object.entries(stored).filter(([, value]) => typeof value === 'boolean')) as PendingTicks
        : {};
    } catch {
      return {};
    }
  }

  private store(key: string, value: unknown) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private browsing or storage blocked: the server copy still has the ticks
    }
  }
}
