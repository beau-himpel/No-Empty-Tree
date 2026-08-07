import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { BreakpointService } from '../../breakpoint.service';
import { Family } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';
import { NominationSettingsService } from '../../nomination-settings.service';
import { FamilyDetailsComponent } from '../family-details/family-details.component';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-adopt-family',
  standalone: true,
  imports: [FamilyDetailsComponent, TitleCasePipe],
  templateUrl: './adopt-family.component.html',
  styleUrls: ['./adopt-family.component.scss']
})
export class AdoptFamilyComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);
  private readonly breakpointService = inject(BreakpointService);
  private readonly nominationSettingsService = inject(NominationSettingsService);

  selectedFamily = signal<Family | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  readonly availableFamilies = signal<Family[]>([]);
  readonly nominationsEnabled = this.nominationSettingsService.nominationsEnabled;

  @ViewChild('familyDetails', { static: false }) familyDetailsRef!: ElementRef;

  // Breakpoint signals
  readonly isMobile = this.breakpointService.isMobile;

  // Card data: member composition + wish-list adoption progress per family
  readonly familyCounts = computed(() =>
    this.availableFamilies().map(family => {
      const items = family.family_members.flatMap(member => member.wishlist_items || []);
      const adoptedGifts = items.filter(item => item.is_adopted).length;
      const totalGifts = items.length;

      return {
        info: family,
        adultCount: family.family_members.filter(member => member.is_parent).length,
        boysCount: family.family_members.filter(member => !member.is_parent && member.sex === 'male').length,
        girlsCount: family.family_members.filter(member => !member.is_parent && member.sex === 'female').length,
        totalGifts,
        adoptedGifts,
        progressPct: totalGifts === 0 ? 0 : Math.round((adoptedGifts / totalGifts) * 100),
        fullyAdopted: totalGifts > 0 && adoptedGifts === totalGifts
      };
    })
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
