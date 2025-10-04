import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
export class AdoptFamilyComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  selectedFamily = signal<Family | null>(null);
  currentUser = signal<string | null>(null);

  // Mock data for demonstration
  readonly availableFamilies = signal<Family[]>(mockFamilies);

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
    this.selectedFamily.set(family);
  }

  onFamilyDetailsClose() {
    this.selectedFamily.set(null);
  }

  navigateToNominate() {
    this.router.navigate(['/nominate-family']);
  }
} 