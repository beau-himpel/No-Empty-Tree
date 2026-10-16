import { TitleCasePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AdoptionService } from '../../adoption.service';
import { AuthService } from '../../auth.service';
import { AnimatedNumberComponent } from '../../shared/animated-number.component';
import { expandCollapse } from '../../shared/animations';
import { Family } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';
import { MemberDetailsComponent } from '../nominate-family/member-details/member-details.component';

@Component({
  selector: 'app-my-adoptions',
  standalone: true,
  imports: [MemberDetailsComponent, TitleCasePipe, AnimatedNumberComponent],
  templateUrl: './my-adoptions.component.html',
  styleUrls: ['./my-adoptions.component.scss'],
  animations: [expandCollapse],
})
export class MyAdoptionsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adoptionService = inject(AdoptionService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  /** List enter/leave animations start only after the first render, so the page doesn't animate in piece by piece. */
  readonly animateChanges = signal(false);

  private readonly families = signal<Family[]>([]);

  readonly adoptedFamilies = computed(() => {
    this.adoptionService.version();
    const userId = this.authService.currentUser()?.id;
    if (!userId) return [];

    return this.families()
      .map((family) => ({
        ...family,
        family_members: family.family_members
          .map((member) => ({
            ...member,
            wishlist_items: (member.wishlist_items || []).filter(
              (item) => item.is_adopted && item.adopted_by === userId
            ),
          }))
          .filter((member) => member.wishlist_items.length > 0),
      }))
      .filter((family) => family.family_members.length > 0);
  });

  readonly totals = computed(() => {
    const families = this.adoptedFamilies();
    const gifts = families.reduce(
      (sum, family) =>
        sum +
        family.family_members.reduce(
          (memberSum, member) => memberSum + (member.wishlist_items?.length || 0),
          0
        ),
      0
    );
    return { gifts, families: families.length };
  });

  ngOnInit() {
    this.loadAdoptedItems();
  }

  async loadAdoptedItems() {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const familiesData = await this.supabaseService.getFamiliesWithMembers();
      this.families.set((familiesData ?? []) as unknown as Family[]);
    } catch (error) {
      console.error('Error loading adopted items:', error);
      this.error.set("We couldn't load your adoptions. Check your connection and try again.");
    } finally {
      this.isLoading.set(false);
      afterNextRender(() => this.animateChanges.set(true), { injector: this.injector });
    }
  }

  navigateToAdoptFamily() {
    this.router.navigate(['/adopt-family']);
  }
}
