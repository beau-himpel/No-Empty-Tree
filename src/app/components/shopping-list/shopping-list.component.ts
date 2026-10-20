import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdoptionService } from '../../adoption.service';
import { AuthService } from '../../auth.service';
import { roleLabel } from '../../shared/person-badge.component';
import { Family, FamilyMember, WishItem } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';
import { adoptedBy, giftCount } from '../my-adoptions/adopted-by';

const STORAGE_PREFIX = 'net:shopping-list:';

/**
 * Everything the signed-in user adopted, by family and then person, as a checklist to
 * shop from on a phone or to print. Ticks are kept on this device only.
 */
@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [RouterLink, TitleCasePipe],
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.scss'],
})
export class ShoppingListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adoptionService = inject(AdoptionService);
  private readonly supabaseService = inject(SupabaseService);

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

  private readonly storageKey = computed(
    () => STORAGE_PREFIX + (this.authService.currentUser()?.id ?? 'anonymous')
  );
  /** Ticked gift ids, reloaded for whoever is signed in. */
  readonly bought = linkedSignal<ReadonlySet<string>>(() => this.readBought(this.storageKey()));

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

  ngOnInit() {
    this.load();
  }

  async load() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const familiesData = await this.supabaseService.getFamiliesWithMembers();
      this.families.set((familiesData ?? []) as unknown as Family[]);
    } catch {
      this.error.set("We couldn't load your adoptions. Check your connection and try again.");
    } finally {
      this.isLoading.set(false);
    }
  }

  isBought(item: WishItem): boolean {
    return this.bought().has(item.id);
  }

  toggle(item: WishItem) {
    const next = new Set(this.bought());
    if (next.has(item.id)) next.delete(item.id);
    else next.add(item.id);
    this.bought.set(next);
    this.writeBought(next);
  }

  clearBought() {
    this.bought.set(new Set());
    this.writeBought(new Set());
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

  private writeBought(ids: ReadonlySet<string>) {
    try {
      if (ids.size === 0) localStorage.removeItem(this.storageKey());
      else localStorage.setItem(this.storageKey(), JSON.stringify([...ids]));
    } catch {
      // Private browsing or storage blocked: ticks just won't survive a reload
    }
  }
}
