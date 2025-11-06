import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BreakpointService } from '../../breakpoint.service';
import { Family } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';
import { FamilyDetailsComponent } from '../family-details/family-details.component';

@Component({
  selector: 'app-adopt-family',
  standalone: true,
  imports: [ProgressSpinnerModule, ButtonModule, FamilyDetailsComponent],
  templateUrl: './adopt-family.component.html',
  styleUrls: ['./adopt-family.component.scss']
})
export class AdoptFamilyComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);
  private readonly breakpointService = inject(BreakpointService);

  selectedFamily = signal<Family | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  readonly availableFamilies = signal<Family[]>([]);

  @ViewChild('familyDetails', { static: false }) familyDetailsRef!: ElementRef;

  // Breakpoint signals
  readonly isMobile = this.breakpointService.isMobile;

  // Computed signals for family counts
  readonly familyCounts = computed(() => 
    this.availableFamilies().map(family => ({
      info: family,
      adultCount: family.family_members.filter(member => member.is_parent).length,
      boysCount: family.family_members.filter(member => !member.is_parent && member.sex === 'male').length,
      girlsCount: family.family_members.filter(member => !member.is_parent && member.sex === 'female').length
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