import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { FamilyDetailsComponent } from '../family-details/family-details.component';
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
  private readonly supabaseService = inject(SupabaseService);

  selectedFamily = signal<Family | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Real data from backend
  readonly availableFamilies = signal<Family[]>([]);

  // Computed signals for family counts
  readonly familyCounts = computed(() => 
    this.availableFamilies().map(family => ({
      id: family.id,
      adultCount: family.family_members.filter(member => !member.is_parent).length,
      boysCount: family.family_members.filter(member => member.is_parent && member.sex === 'male').length,
      girlsCount: family.family_members.filter(member => member.is_parent && member.sex === 'female').length
    }))
  );

  ngOnInit() {
    this.loadFamilies();
  }

  async loadFamilies() {
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const familiesData = await this.supabaseService.getFamiliesWithMembers();
      this.availableFamilies.set(familiesData as unknown as Family[]);
    } catch (err) {
      this.error.set('Failed to load families. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }


  getFamilyCounts(familyId: string): { adultCount: number; boysCount: number; girlsCount: number } {
    const family = this.availableFamilies().find(f => f.id === familyId);
    if (!family) return { adultCount: 0, boysCount: 0, girlsCount: 0 };
    
    return {
      adultCount: family.family_members.filter(member => !member.is_parent).length,
      boysCount: family.family_members.filter(member => member.is_parent && member.sex === 'male').length,
      girlsCount: family.family_members.filter(member => member.is_parent && member.sex === 'female').length
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