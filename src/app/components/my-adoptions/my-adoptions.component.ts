import { Component, inject, signal, computed } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { mockFamilies } from '../../mock-data/families';
import { AuthService } from '../../auth.service';

interface Family {
  id: string;
  name: string;
  members: FamilyMember[];
}

interface FamilyMember {
  name: string;
  age: number;
  gender: string;
  isChild: boolean;
  wishList: WishItem[];
}

interface WishItem {
  id: string;
  category: string;
  description: string;
  color?: string;
  size?: string;
  isAdopted: boolean;
  adoptedBy?: string;
  link?: string;
  details?: string;
}

@Component({
  selector: 'app-my-adoptions',
  standalone: true,
  imports: [CardModule, ButtonModule],
  templateUrl: './my-adoptions.component.html',
  styleUrls: ['./my-adoptions.component.scss']
})
export class MyAdoptionsComponent {
  readonly availableFamilies = signal<Family[]>(mockFamilies);
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
      family.members.forEach(member => {
        member.wishList.forEach(item => {
          if (item.isAdopted && item.adoptedBy === currentUser) {
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
    item.isAdopted = false;
    item.adoptedBy = undefined;
    console.log(`Unadopted item: ${item.description} for ${family.name}`);
  }
} 