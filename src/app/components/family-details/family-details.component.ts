import { Component, input, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Family, FamilyMember, WishItem } from '../../shared/types';
import { WishItemComponent } from '../wish-item/wish-item.component';

@Component({
  selector: 'app-family-details',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, WishItemComponent],
  templateUrl: './family-details.component.html',
  styleUrls: ['./family-details.component.scss']
})
export class FamilyDetailsComponent {
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

  toggleMemberWishList(memberName: string) {
    const current = this.expandedMembers();
    const newSet = new Set(current);
    
    if (newSet.has(memberName)) {
      newSet.delete(memberName);
    } else {
      newSet.add(memberName);
    }
    
    this.expandedMembers.set(newSet);
  }

  isMemberExpanded(memberName: string): boolean {
    return this.expandedMembers().has(memberName);
  }

  adoptItem(item: WishItem, family: Family) {
    const user = this.currentUser();
    if (!user) return;
    
    item.is_adopted = true;
    item.adopted_by = user;
    console.log(`Adopted item: ${item.description} for ${family.last_name}`);
  }

  unadoptItem(item: WishItem, family: Family) {
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
  }

  isAdoptedByCurrentUser(item: WishItem): boolean {
    const user = this.currentUser();
    return item.is_adopted && item.adopted_by === user;
  }

  adoptAllItems(family: Family, event: Event) {
    event.stopPropagation();
    const user = this.currentUser();
    if (!user) return;
    
    family.family_members.forEach(member => {
      member.wishlist_items?.forEach(item => {
        item.is_adopted = true;
        item.adopted_by = user;
      });
    });
    console.log('Adopted all items for family:', family.last_name);
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
  adoptAllRemainingItems(family: Family, event: Event) {
    event.stopPropagation();
    const user = this.currentUser();
    if (!user) return;
    
    family.family_members.forEach(member => {
      member.wishlist_items?.forEach(item => {
        if (!item.is_adopted) {
          item.is_adopted = true;
          item.adopted_by = user;
        }
      });
    });
    console.log('Adopted all remaining items for family:', family.last_name);
  }
} 