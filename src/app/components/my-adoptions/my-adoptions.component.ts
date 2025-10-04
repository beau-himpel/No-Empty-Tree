import { Component, inject, signal, computed } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../auth.service';
import { Family, FamilyMember, WishItem } from '../../shared/types';

@Component({
  selector: 'app-my-adoptions',
  standalone: true,
  imports: [CardModule, ButtonModule],
  templateUrl: './my-adoptions.component.html',
  styleUrls: ['./my-adoptions.component.scss']
})
export class MyAdoptionsComponent {
  readonly availableFamilies = signal<Family[]>([]);
  private readonly authService = inject(AuthService);

  // Computed signal to get all items adopted by current user
  readonly myAdoptedItems = computed(() => {
    // const currentUser = this.authService.getCurrentUser();
    const currentUser = 'test';
    if (!currentUser) return [];

    const adoptedItems: Array<{
      family: Family;
      member: FamilyMember;
      item: WishItem;
    }> = [];

    this.availableFamilies().forEach(family => {
      family.family_members.forEach(member => {
        member.wishlist_items?.forEach(item => {
          if (item.is_adopted && item.adopted_by === currentUser) {
            adoptedItems.push({ family, member, item });
          }
        });
      });
    });

    return adoptedItems;
  });

  // Group adopted items by family
  readonly adoptedItemsByFamily = computed(() => {
    const items = this.myAdoptedItems();
    const grouped = new Map<string, Array<{ member: FamilyMember; item: WishItem }>>();

    items.forEach(({ family, member, item }) => {
      if (!grouped.has(family.id)) {
        grouped.set(family.id, []);
      }
      grouped.get(family.id)!.push({ member, item });
    });

    return Array.from(grouped.entries()).map(([familyId, items]) => {
      const family = this.availableFamilies().find(f => f.id === familyId)!;
      return { family, items };
    });
  });

  unadoptItem(item: WishItem, family: Family) {
    item.is_adopted = false;
    item.adopted_by = undefined;
    console.log(`Unadopted item: ${item.description} for ${family.last_name}`);
  }
} 