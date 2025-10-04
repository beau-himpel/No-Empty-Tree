import { Component, input, signal, computed, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Family, FamilyMember, WishItem } from '../../shared/types';
import { WishItemComponent } from '../wish-item/wish-item.component';
import { SupabaseService } from '../../supabase.service';

@Component({
  selector: 'app-family-details',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, WishItemComponent],
  templateUrl: './family-details.component.html',
  styleUrls: ['./family-details.component.scss']
})
export class FamilyDetailsComponent {
  private supabaseService = inject(SupabaseService);
  
  family = input<Family | null>(null);
  currentUser = input<string | null>(null);
  expandedMembers = signal<Set<string>>(new Set());
  closeRequested = output<void>();

  // Computed signal for selected family counts
  readonly familyCounts = computed(() => {
    const selectedFamily = this.family();
    if (!selectedFamily) return { adultCount: 0, childCount: 0 };
    
    return {
      adultCount: selectedFamily.family_members.filter(member => !member.is_parent).length,
      childCount: selectedFamily.family_members.filter(member => member.is_parent).length
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
    if (!user) return;
    
    try {
      await this.supabaseService.adoptWishlistItem(item.id, user);
      
      // Update the local state
      item.is_adopted = true;
      item.adopted_by = user;
      console.log(`Adopted item: ${item.description} for ${family.last_name}`);
    } catch (error) {
      console.error('Error adopting item:', error);
      // You might want to show a user-friendly error message here
    }
  }

  async unadoptItem(item: WishItem, family: Family) {
    try {
      // Call the backend to unadopt the item
      await this.supabaseService.unadoptWishlistItem(item.id);
      
      // Update the local state
      item.is_adopted = false;
      item.adopted_by = undefined;
      
      // Find the member who owns this item and expand their wish list
      const member = family.family_members.find(m => m.wishlist_items?.includes(item));
      if (member) {
        const current = this.expandedMembers();
        const newSet = new Set(current);
        newSet.add(member.first_name);
        this.expandedMembers.set(newSet);
      }
      
      console.log(`Unadopted item: ${item.description} for ${family.last_name}`);
    } catch (error) {
      console.error('Error unadopting item:', error);
      // You might want to show a user-friendly error message here
    }
  }

  isAdoptedByCurrentUser(item: WishItem): boolean {
    const user = this.currentUser();
    return item.is_adopted && item.adopted_by === user;
  }

  async adoptAllItems(family: Family, event: Event) {
    event.stopPropagation();
    const user = this.currentUser();
    if (!user) return;
    
    try {
      // Adopt all items in parallel
      const adoptPromises = family.family_members.flatMap(member => 
        member.wishlist_items?.map(item => 
          this.supabaseService.adoptWishlistItem(item.id, user)
        ) || []
      );
      
      await Promise.all(adoptPromises);
      
      // Update local state
      family.family_members.forEach(member => {
        member.wishlist_items?.forEach(item => {
          item.is_adopted = true;
          item.adopted_by = user;
        });
      });
      
      console.log('Adopted all items for family:', family.last_name);
    } catch (error) {
      console.error('Error adopting all items:', error);
      // You might want to show a user-friendly error message here
    }
  }

  isAllItemsAdopted(member: FamilyMember): boolean {
    return (member.wishlist_items?.length || 0) > 0 && (member.wishlist_items?.every(item => item.is_adopted) || false);
  }

  // Check if any items in the family have been adopted
  hasAnyAdoptedItems(family: Family): boolean {
    return family.family_members.some(member => 
      member.wishlist_items?.some(item => item.is_adopted) || false
    );
  }

  // Check if all items in the family have been adopted
  areAllItemsAdopted(family: Family): boolean {
    return family.family_members.every(member => 
      (member.wishlist_items?.length || 0) === 0 || 
      (member.wishlist_items?.every(item => item.is_adopted) || false)
    );
  }

  // Adopt all remaining (unadopted) items for the family
  async adoptAllRemainingItems(family: Family, event: Event) {
    event.stopPropagation();
    const user = this.currentUser();
    if (!user) return;
    
    try {
      // Adopt all unadopted items in parallel
      const adoptPromises = family.family_members.flatMap(member => 
        member.wishlist_items?.filter(item => !item.is_adopted).map(item => 
          this.supabaseService.adoptWishlistItem(item.id, user)
        ) || []
      );
      
      await Promise.all(adoptPromises);
      
      // Update local state
      family.family_members.forEach(member => {
        member.wishlist_items?.forEach(item => {
          if (!item.is_adopted) {
            item.is_adopted = true;
            item.adopted_by = user;
          }
        });
      });
      
      console.log('Adopted all remaining items for family:', family.last_name);
    } catch (error) {
      console.error('Error adopting all remaining items:', error);
      // You might want to show a user-friendly error message here
    }
  }
} 