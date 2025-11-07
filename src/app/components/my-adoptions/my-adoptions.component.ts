import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../auth.service';
import { Family, FamilyMember, WishItem } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';
import { MemberDetailsComponent } from '../nominate-family/member-details/member-details.component';

@Component({
  selector: 'app-my-adoptions',
  standalone: true,
  imports: [ButtonModule, MemberDetailsComponent, ProgressSpinnerModule],
  providers: [MessageService],
  templateUrl: './my-adoptions.component.html',
  styleUrls: ['./my-adoptions.component.scss'],
})
export class MyAdoptionsComponent implements OnInit {
  readonly adoptedFamilies = signal<Family[]>([]);
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
      const familiesData = await this.supabaseService.getFamiliesWithMembers();

      if (familiesData) {
        const filteredAdoptedFamilies = familiesData
          .map((family) => ({
            ...family,
            family_members: family.family_members
              .filter((member) =>
                member.wishlist_items?.some(
                  (item) => item.adopted_by === user.id
                )
              )
              .map((member) => ({
                ...member,
                wishlist_items:
                  member.wishlist_items?.filter(
                    (item) => item.adopted_by === user.id
                  ) || [],
              })),
          }))
          .filter((family) => family.family_members.length > 0);
          // if (filteredAdoptedFamilies.length > 0) {
          //   this.adoptedFamilies.set(filteredAdoptedFamilies);
          // }
          console.log('filteredAdoptedFamilies', filteredAdoptedFamilies);
      }


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
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error unadopting item',
      });
    }
  }

  navigateToAdoptFamily() {
    this.router.navigate(['adopt-family']);
  }
}
