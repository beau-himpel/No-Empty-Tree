import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { BreakpointService } from '../../breakpoint.service';
import { FamilyDetailsComponent } from '../family-details/family-details.component';
import { Family } from '../../shared/types';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-adopt-family',
  standalone: true,
  imports: [ProgressSpinnerModule, ButtonModule, FamilyDetailsComponent],
  templateUrl: './adopt-family.component.html',
  styleUrls: ['./adopt-family.component.scss']
})
export class AdoptFamilyComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);
  private readonly breakpointService = inject(BreakpointService);

  selectedFamily = signal<Family | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Real data from backend
  readonly availableFamilies = signal<Family[]>([]);

  @ViewChild('familyDetails', { static: false }) familyDetailsRef!: ElementRef;

  // Breakpoint signals
  readonly isMobile = this.breakpointService.isMobile;

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

  ngAfterViewInit() {
    // This lifecycle hook is required for AfterViewInit interface
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
    if (this.selectedFamily()?.id === family.id) {
      this.selectedFamily.set(null);
    } else {
      this.selectedFamily.set(family);
      
      if (this.isMobile()) {
        setTimeout(() => {
          if (this.familyDetailsRef) {
            this.familyDetailsRef.nativeElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 0);
      }
    }
  }

  onFamilyDetailsClose() {
    this.selectedFamily.set(null);
  }

  navigateToNominate() {
    this.router.navigate(['/nominate-family']);
  }
} 