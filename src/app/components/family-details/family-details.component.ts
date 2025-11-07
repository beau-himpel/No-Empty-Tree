import {
  Component,
  input,
  signal,
  computed,
  output,
  inject,
  effect,
} from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Family, FamilyMember, WishItem } from '../../shared/types';
import { WishItemComponent } from '../wish-item/wish-item.component';
import { SupabaseService } from '../../supabase.service';
import { AuthService } from '../../auth.service';
import { MessageService } from 'primeng/api';
import { BreakpointService } from '../../breakpoint.service';

@Component({
  selector: 'app-family-details',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    WishItemComponent,
  ],
  providers: [MessageService],
  templateUrl: './family-details.component.html',
  styleUrls: ['./family-details.component.scss'],
  animations: [
    trigger('slideDown', [
      state('collapsed', style({ height: '0px', opacity: 0, overflow: 'hidden' })),
      state('expanded', style({ height: '*', opacity: 1, overflow: 'visible' })),
      transition('collapsed <=> expanded', animate('300ms ease-in-out'))
    ])
  ]
})
export class FamilyDetailsComponent {
  private supabaseService = inject(SupabaseService);
  private messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly breakpointService = inject(BreakpointService);

  family = input<Family | null>(null);
  currentUser = this.authService.currentUser;
  expandedMembers = signal<Set<string>>(new Set());
  collapsedMembers = signal<Set<string>>(new Set());
  closeRequested = output<void>();
  dataRefreshRequested = output<void>();
  readonly isMobile = this.breakpointService.isMobile;

  private initializeCollapsedMembers() {
    const selectedFamily = this.family();
    if (selectedFamily) {
      const memberNames = new Set(selectedFamily.family_members.map(member => member.first_name));
      this.collapsedMembers.set(memberNames);
    }
  }

  constructor() {
    effect(() => {
      const selectedFamily = this.family();
      if (selectedFamily) {
        this.initializeCollapsedMembers();
      }
    });
  }

  showConfirmationModal = signal<boolean>(false);
  pendingFamily = signal<Family | null>(null);
  modalType = signal<'all' | 'remaining'>('all');
  
  showUnadoptConfirmationModal = signal<boolean>(false);
  pendingUnadoptItem = signal<{ item: WishItem; family: Family } | null>(null);

  readonly familyCounts = computed(() => {
    const selectedFamily = this.family();
    if (!selectedFamily) return { adultCount: 0, childCount: 0 };

    return {
      adultCount: selectedFamily.family_members.filter(
        (member) => member.is_parent
      ).length,
      childCount: selectedFamily.family_members.filter(
        (member) => !member.is_parent
      ).length,
    };
  });

  isMemberExpanded(memberName: string): boolean {
    return this.expandedMembers().has(memberName);
  }

  async adoptItem(item: WishItem, family: Family) {
    const user = this.currentUser();
    if (!user) return;

    try {
      await this.supabaseService.adoptWishlistItem(item.id, user?.id);

      item.is_adopted = true;
      item.adopted_by = user?.id;
      item.adopted_by_name = user.user_metadata?.['full_name']

      this.refreshFamilyData(family);
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error adopting item' });
    }
  }

  private refreshFamilyData(family: Family) {
    this.dataRefreshRequested.emit();
  }

  showUnadoptConfirmation(item: WishItem, family: Family) {
    this.pendingUnadoptItem.set({ item, family });
    this.showUnadoptConfirmationModal.set(true);
  }

  async confirmUnadopt() {
    const pendingData = this.pendingUnadoptItem();
    if (!pendingData) return;

    const { item, family } = pendingData;

    try {
      await this.supabaseService.unadoptWishlistItem(item.id);

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
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error unadopting item' });
    } finally {
      this.showUnadoptConfirmationModal.set(false);
      this.pendingUnadoptItem.set(null);
    }
  }

  cancelUnadopt() {
    this.showUnadoptConfirmationModal.set(false);
    this.pendingUnadoptItem.set(null);
  }

  isAdoptedByCurrentUser(item: WishItem): boolean {
    const user = this.currentUser();
    return item.is_adopted && item.adopted_by === user?.id;
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
              this.supabaseService.adoptWishlistItem(item.id, user?.id)
            ) || []
        );

        await Promise.all(adoptPromises);

        family.family_members.forEach((member) => {
          member.wishlist_items?.forEach((item) => {
            item.is_adopted = true;
            item.adopted_by = user?.id;
          });
        });
      } else {
        const adoptPromises = family.family_members.flatMap(
          (member) =>
            member.wishlist_items
              ?.filter((item) => !item.is_adopted)
              .map((item) =>
                this.supabaseService.adoptWishlistItem(item.id, user?.id)
              ) || []
        );

        await Promise.all(adoptPromises);

        family.family_members.forEach((member) => {
          member.wishlist_items?.forEach((item) => {
            if (!item.is_adopted) {
              item.is_adopted = true;
              item.adopted_by = user?.id;
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

  toggleWishlist(memberFirstName: string, event: Event) {
    event.stopPropagation();
    const current = this.collapsedMembers();
    const newSet = new Set(current);
    if (newSet.has(memberFirstName)) {
      newSet.delete(memberFirstName);
    } else {
      newSet.add(memberFirstName);
    }
    this.collapsedMembers.set(newSet);
  }

  isWishlistCollapsed(memberFirstName: string): boolean {
    return this.collapsedMembers().has(memberFirstName);
  }
}
