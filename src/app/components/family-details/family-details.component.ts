import {
  Component,
  input,
  signal,
  computed,
  output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Family, FamilyMember, WishItem } from '../../shared/types';
import { WishItemComponent } from '../wish-item/wish-item.component';
import { SupabaseService } from '../../supabase.service';

@Component({
  selector: 'app-family-details',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DialogModule,
    WishItemComponent,
  ],
  templateUrl: './family-details.component.html',
  styleUrls: ['./family-details.component.scss'],
})
export class FamilyDetailsComponent {
  private supabaseService = inject(SupabaseService);

  family = input<Family | null>(null);
  currentUser = input.required<string>();
  expandedMembers = signal<Set<string>>(new Set());
  closeRequested = output<void>();
  dataRefreshRequested = output<void>();

  // Modal state management
  showConfirmationModal = signal<boolean>(false);
  pendingFamily = signal<Family | null>(null);
  modalType = signal<'all' | 'remaining'>('all');

  // Computed signal for selected family counts
  readonly familyCounts = computed(() => {
    const selectedFamily = this.family();
    if (!selectedFamily) return { adultCount: 0, childCount: 0 };

    return {
      adultCount: selectedFamily.family_members.filter(
        (member) => !member.is_parent
      ).length,
      childCount: selectedFamily.family_members.filter(
        (member) => member.is_parent
      ).length,
    };
  });

  // Computed signal to get sorted wish list items (unadopted first)
  getSortedWishList(wishList: WishItem[]): WishItem[] {
    return [...wishList].sort((a, b) => {
      // Unadopted items first
      if (!a.is_adopted && b.is_adopted) return -1;
      if (a.is_adopted && !b.is_adopted) return 1;

      // If both have same adoption status, maintain original order
      return 0;
    });
  }

  isMemberExpanded(memberName: string): boolean {
    return this.expandedMembers().has(memberName);
  }

  async adoptItem(item: WishItem, family: Family) {
    const user = this.currentUser();

    try {
      await this.supabaseService.adoptWishlistItem(item.id, user);

      // Update the local state
      item.is_adopted = true;
      item.adopted_by = user;

      this.refreshFamilyData(family);
    } catch (error) {
      // You might want to show a user-friendly error message here
    }
  }

  private refreshFamilyData(family: Family) {
    this.dataRefreshRequested.emit();
  }

  async unadoptItem(item: WishItem, family: Family) {
    try {
      await this.supabaseService.unadoptWishlistItem(item.id);

      // Update the local state
      item.is_adopted = false;
      item.adopted_by = undefined;

      const member = family.family_members.find((m) =>
        m.wishlist_items?.includes(item)
      );
      if (member) {
        const current = this.expandedMembers();
        const newSet = new Set(current);
        newSet.add(member.first_name);
        this.expandedMembers.set(newSet);
      }
    } catch (error) {
      // You might want to show a user-friendly error message here
    }
  }

  isAdoptedByCurrentUser(item: WishItem): boolean {
    const user = this.currentUser();
    return item.is_adopted && item.adopted_by === user;
  }

  showAdoptAllConfirmation(family: Family, event: Event) {
    event.stopPropagation();
    this.pendingFamily.set(family);
    this.modalType.set('all');
    this.showConfirmationModal.set(true);
  }

  async confirmAdoption() {
    const family = this.pendingFamily();
    if (!family) return;

    const user = this.currentUser();
    if (!user) return;

    try {
      const isAllItems = this.modalType() === 'all';

      if (isAllItems) {
        const adoptPromises = family.family_members.flatMap(
          (member) =>
            member.wishlist_items?.map((item) =>
              this.supabaseService.adoptWishlistItem(item.id, user)
            ) || []
        );

        await Promise.all(adoptPromises);

        family.family_members.forEach((member) => {
          member.wishlist_items?.forEach((item) => {
            item.is_adopted = true;
            item.adopted_by = user;
          });
        });
      } else {
        const adoptPromises = family.family_members.flatMap(
          (member) =>
            member.wishlist_items
              ?.filter((item) => !item.is_adopted)
              .map((item) =>
                this.supabaseService.adoptWishlistItem(item.id, user)
              ) || []
        );

        await Promise.all(adoptPromises);

        family.family_members.forEach((member) => {
          member.wishlist_items?.forEach((item) => {
            if (!item.is_adopted) {
              item.is_adopted = true;
              item.adopted_by = user;
            }
          });
        });
      }

      this.refreshFamilyData(family);
    } catch (error) {
      // You might want to show a user-friendly error message here
    } finally {
      this.showConfirmationModal.set(false);
      this.pendingFamily.set(null);
    }
  }

  cancelAdoption() {
    this.showConfirmationModal.set(false);
    this.pendingFamily.set(null);
  }

  isAllItemsAdopted(member: FamilyMember): boolean {
    return (
      (member.wishlist_items?.length || 0) > 0 &&
      (member.wishlist_items?.every((item) => item.is_adopted) || false)
    );
  }

  hasAnyAdoptedItems(family: Family): boolean {
    return family.family_members.some(
      (member) =>
        member.wishlist_items?.some((item) => item.is_adopted) || false
    );
  }

  areAllItemsAdopted(family: Family): boolean {
    return family.family_members.every(
      (member) =>
        (member.wishlist_items?.length || 0) === 0 ||
        member.wishlist_items?.every((item) => item.is_adopted) ||
        false
    );
  }

  showAdoptRemainingConfirmation(family: Family, event: Event) {
    event.stopPropagation();
    this.pendingFamily.set(family);
    this.modalType.set('remaining');
    this.showConfirmationModal.set(true);
  }
}
