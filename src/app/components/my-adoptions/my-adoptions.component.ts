import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../auth.service';
import { Family, FamilyMember, WishItem } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';

interface AdoptedFamily {
  family: Family;
  familyMembers: Array<{
    member: FamilyMember;
    adoptedItems: WishItem[];
  }>;
}

@Component({
  selector: 'app-my-adoptions',
  standalone: true,
  imports: [ButtonModule, ProgressSpinnerModule],
  providers: [MessageService],
  templateUrl: './my-adoptions.component.html',
  styleUrls: ['./my-adoptions.component.scss']
})
export class MyAdoptionsComponent implements OnInit {
  readonly adoptedFamilies = signal<AdoptedFamily[]>([]);
  readonly isLoading = signal<boolean>(true);
  private readonly authService = inject(AuthService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  ngOnInit() {
    this.loadAdoptedItems();
  }

  private async loadAdoptedItems() {
    this.isLoading.set(true);
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.adoptedFamilies.set([]);
      return;
    }

    try {
      const data = await this.supabaseService.getAdoptedItemsWithDetails(user.id);
      
      if (!data) {
        this.adoptedFamilies.set([]);
        return;
      }

      // Group items by family
      const familiesMap = new Map<string, AdoptedFamily>();

      data.forEach((item: any) => {
        const member = item.family_members;
        const familyData = member.families;
        const familyId = familyData.id;

        if (!familiesMap.has(familyId)) {
          familiesMap.set(familyId, {
            family: {
              id: familyData.id,
              last_name: familyData.last_name,
              address: familyData.address,
              phone: familyData.phone,
              email: familyData.email,
              nominated_by: familyData.nominated_by,
              created_at: familyData.created_at,
              updated_at: familyData.updated_at,
              family_members: []
            },
            familyMembers: []
          });
        }

        const familyEntry = familiesMap.get(familyId)!;
        
        // Find or create the family member entry
        let memberEntry = familyEntry.familyMembers.find(
          m => m.member.id === member.id
        );

        if (!memberEntry) {
          memberEntry = {
            member: {
              id: member.id,
              family_id: member.family_id,
              first_name: member.first_name,
              age: member.age,
              sex: member.sex,
              is_parent: member.is_parent,
              created_at: member.created_at,
              updated_at: member.updated_at,
              wishlist_items: []
            },
            adoptedItems: []
          };
          familyEntry.familyMembers.push(memberEntry);
        }

        // Add the item to this member's adopted items
        const wishItem: WishItem = {
          id: item.id,
          family_member_id: item.family_member_id,
          category: item.category,
          description: item.description,
          color: item.color,
          size: item.size,
          is_adopted: item.is_adopted,
          adopted_by: item.adopted_by,
          adopted_by_name: item.adopted_by_name,
          link: item.link,
          details: item.details,
          created_at: item.created_at,
          updated_at: item.updated_at
        };
        memberEntry.adoptedItems.push(wishItem);
      });

      // Convert map to array and sort
      const familiesArray = Array.from(familiesMap.values());
      
      // Sort families by last_name alphabetically
      familiesArray.sort((a, b) => a.family.last_name.localeCompare(b.family.last_name));
      
      // Sort family members by age within each family
      familiesArray.forEach(family => {
        family.familyMembers.sort((a, b) => a.member.age - b.member.age);
      });

      console.log('familiesArray', familiesArray);

      this.adoptedFamilies.set(familiesArray);
    } catch (error) {
      console.error('Error loading adopted items:', error);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Failed to load adopted items' 
      });
      this.adoptedFamilies.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async unadoptItem(item: WishItem) {
    try {
      await this.supabaseService.unadoptWishlistItem(item.id);
      // Reload the data to reflect the changes
      await this.loadAdoptedItems();
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error unadopting item' });
    }
  }

  navigateToAdoptFamily() {
    this.router.navigate(['adopt-family']);
  }
} 