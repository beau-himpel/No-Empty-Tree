import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { SupabaseService } from '../../supabase.service';
import { FamilyDetailsComponent } from './family-details.component';
import { Family } from '../../shared/types';

@Component({
  selector: 'app-adopt-family',
  standalone: true,
  imports: [CardModule, ButtonModule, FamilyDetailsComponent],
  templateUrl: './adopt-family.component.html',
  styleUrls: ['./adopt-family.component.scss']
})
export class AdoptFamilyComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly supabaseService = inject(SupabaseService);

  selectedFamily = signal<Family | null>(null);
  currentUser = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Real data from backend
  readonly availableFamilies = signal<Family[]>([]);

  // Computed signals for family counts
  readonly familyCounts = computed(() => 
    this.availableFamilies().map(family => ({
      id: family.id,
      adultCount: family.members.filter(member => !member.is_parent).length,
      childCount: family.members.filter(member => member.is_parent).length
    }))
  );

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser.set(user.email ?? 'Unknown User');
    }
    this.loadFamilies();
  }

  async loadFamilies() {
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const familiesData = await this.supabaseService.getFamiliesWithMembers();
      // Transform the backend data to match our frontend interface
      const transformedFamilies = this.transformBackendData(familiesData);
      this.availableFamilies.set(transformedFamilies);
    } catch (err) {
      console.error('Error loading families:', err);
      this.error.set('Failed to load families. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private transformBackendData(backendData: any[]): Family[] {
    return backendData.map(family => ({
      id: family.id,
      last_name: family.last_name,
      address: family.address,
      phone: family.phone,
      email: family.email,
      nominated_by: family.nominated_by,
      created_at: family.created_at,
      updated_at: family.updated_at,
      members: family.family_members?.map((member: any) => ({
        id: member.id,
        family_id: member.family_id || family.id,
        first_name: member.first_name,
        age: member.age,
        sex: member.sex,
        is_parent: member.is_parent,
        created_at: member.created_at,
        updated_at: member.updated_at,
        wishlist_items: member.wishlist_items?.map((item: any) => ({
          id: item.id,
          family_member_id: item.family_member_id,
          category: item.category,
          description: item.description,
          color: item.color,
          size: item.size,
          is_adopted: item.is_adopted,
          adopted_by: item.adopted_by,
          link: item.link,
          details: item.details,
          created_at: item.created_at,
          updated_at: item.updated_at
        })) || []
      })) || []
    }));
  }

  getFamilyCounts(familyId: string): { adultCount: number; childCount: number } {
    const family = this.availableFamilies().find(f => f.id === familyId);
    if (!family) return { adultCount: 0, childCount: 0 };
    
    return {
      adultCount: family.members.filter(member => !member.is_parent).length,
      childCount: family.members.filter(member => member.is_parent).length
    };
  }

  viewFamilyDetails(family: Family) {
    // If clicking on the same family that's already selected, close the details
    if (this.selectedFamily()?.id === family.id) {
      this.selectedFamily.set(null);
    } else {
      // Otherwise, show the details for the clicked family
      this.selectedFamily.set(family);
    }
  }

  onFamilyDetailsClose() {
    this.selectedFamily.set(null);
  }

  navigateToNominate() {
    this.router.navigate(['/nominate-family']);
  }
} 