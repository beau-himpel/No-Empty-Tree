import { Component, inject, signal, computed, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { mockFamilies } from '../../mock-data/families';
import { AuthService } from '../../auth.service';
import { FamilyDetailsComponent } from './family-details.component';
import { Family } from '../../shared/types';

@Component({
  selector: 'app-adopt-family',
  standalone: true,
  imports: [CardModule, ButtonModule, FamilyDetailsComponent],
  templateUrl: './adopt-family.component.html',
  styleUrls: ['./adopt-family.component.scss']
})
export class AdoptFamilyComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  @ViewChild(FamilyDetailsComponent) familyDetailsComponent!: FamilyDetailsComponent;

  selectedFamily = signal<Family | null>(null);
  currentUser = signal<string | null>(null);

  // Mock data for demonstration
  readonly availableFamilies = signal<Family[]>(mockFamilies);

  // Computed signals for family counts
  readonly familyCounts = computed(() => 
    this.availableFamilies().map(family => ({
      id: family.id,
      adultCount: family.members.filter(member => !member.isChild).length,
      childCount: family.members.filter(member => member.isChild).length
    }))
  );

  ngOnInit(): void {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  ngAfterViewInit(): void {
    // Ensure ViewChild is available
  }

  getFamilyCounts(familyId: string): { adultCount: number; childCount: number } {
    const family = this.availableFamilies().find(f => f.id === familyId);
    if (!family) return { adultCount: 0, childCount: 0 };
    
    return {
      adultCount: family.members.filter(member => !member.isChild).length,
      childCount: family.members.filter(member => member.isChild).length
    };
  }

  viewFamilyDetails(family: Family): void {
    this.selectedFamily.set(family);
    
    // Use a more reliable approach to open the dialog
    if (this.familyDetailsComponent) {
      this.familyDetailsComponent.openDialog();
    } else {
      // Fallback: try again after a short delay
      setTimeout(() => {
        if (this.familyDetailsComponent) {
          this.familyDetailsComponent.openDialog();
        } else {
          console.error('FamilyDetailsComponent not available');
        }
      }, 100);
    }
  }

  navigateToNominate(): void {
    this.router.navigate(['/nominate-family']);
  }
} 