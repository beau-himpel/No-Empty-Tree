import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../auth.service';
import { BreakpointService } from '../../breakpoint.service';
import { Family, WishItem } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';
import { MemberDetailsComponent } from '../nominate-family/member-details/member-details.component';

@Component({
  selector: 'app-family-details',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    MemberDetailsComponent,
  ],
  providers: [MessageService],
  templateUrl: './family-details.component.html',
  styleUrls: ['./family-details.component.scss'],
})
export class FamilyDetailsComponent {
  closeRequested = output<void>();
  dataRefreshRequested = output<void>();

  private supabaseService = inject(SupabaseService);
  private messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly breakpointService = inject(BreakpointService);

  // family = input.required<Family>();
  family = input<Family | null>(null);
  currentUser = this.authService.currentUser;
  readonly isMobile = this.breakpointService.isMobile;

  showConfirmationModal = signal<boolean>(false);
  modalType = signal<'all' | 'remaining'>('all');
  
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

  async adoptItem(item: WishItem) {
    const user = this.currentUser();
    if (!user) return;

    const selectedFamily = this.family();
    if (!selectedFamily) return;

    try {
      await this.supabaseService.adoptWishlistItem(item.id, user?.id);

      item.is_adopted = true;
      item.adopted_by = user?.id;
      item.adopted_by_name = {full_name: user.user_metadata?.['full_name']}

      this.dataRefreshRequested.emit();
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error adopting item' });
    }
  }

  async unadoptItem(item: WishItem) {
    try {
      await this.supabaseService.unadoptWishlistItem(item.id);

      item.is_adopted = false;
      item.adopted_by = undefined;
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error unadopting item' });
    }
  }

  isAdoptedByCurrentUser(item: WishItem): boolean {
    const user = this.currentUser();
    return item.is_adopted && item.adopted_by === user?.id;
  }

  showAdoptAllConfirmation(event: Event) {
    event.stopPropagation();
    const selectedFamily = this.family();
    if (!selectedFamily) return;
    
    this.modalType.set('all');
    this.showConfirmationModal.set(true);
  }

  async confirmAdoption() {
    const family = this.family();
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

      this.dataRefreshRequested.emit();
    } catch (error) {
      // You might want to show a user-friendly error message here
    } finally {
      this.showConfirmationModal.set(false);
    }
  }

  cancelAdoption() {
    this.showConfirmationModal.set(false);
  }

  hasAnyAdoptedItems(): boolean {
    const selectedFamily = this.family();
    if (!selectedFamily) return false;
    
    return selectedFamily.family_members.some(
      (member) =>
        member.wishlist_items?.some((item) => item.is_adopted) || false
    );
  }

  areAllItemsAdopted(): boolean {
    const selectedFamily = this.family();
    if (!selectedFamily) return false;
    
    return selectedFamily.family_members.every(
      (member) =>
        (member.wishlist_items?.length || 0) === 0 ||
        member.wishlist_items?.every((item) => item.is_adopted) ||
        false
    );
  }

  showAdoptRemainingConfirmation(event: Event) {
    event.stopPropagation();
    const selectedFamily = this.family();
    if (!selectedFamily) return;
    
    this.modalType.set('remaining');
    this.showConfirmationModal.set(true);
  }
}
