import { TitleCasePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  Injector,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AdoptionService } from '../../adoption.service';
import { AuthService } from '../../auth.service';
import { NominationSettingsService } from '../../nomination-settings.service';
import { AnimatedNumberComponent } from '../../shared/animated-number.component';
import { FamilyTabComponent } from '../../shared/family-tab.component';
import { expandCollapse } from '../../shared/animations';
import { Family } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';
import { MemberDetailsComponent } from '../nominate-family/member-details/member-details.component';
import { adoptedBy, giftCount } from './adopted-by';

@Component({
  selector: 'app-my-adoptions',
  standalone: true,
  imports: [
    MemberDetailsComponent,
    TitleCasePipe,
    AnimatedNumberComponent,
    RouterLink,
    FamilyTabComponent,
  ],
  templateUrl: './my-adoptions.component.html',
  styleUrls: ['./my-adoptions.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [expandCollapse],
})
export class MyAdoptionsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adoptionService = inject(AdoptionService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly nominationSettings = inject(NominationSettingsService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  /** List enter/leave animations start only after the first render, so the page doesn't animate in piece by piece. */
  readonly animateChanges = signal(false);

  private readonly families = signal<Family[]>([]);

  readonly adoptedFamilies = computed(() => {
    this.adoptionService.version();
    return adoptedBy(this.families(), this.authService.currentUser()?.id);
  });

  readonly totals = computed(() => {
    const families = this.adoptedFamilies();
    return { gifts: giftCount(families), families: families.length };
  });

  ngOnInit() {
    this.loadAdoptedItems();
  }

  async loadAdoptedItems() {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const season = await this.nominationSettings.currentSeason();
      const familiesData =
        await this.supabaseService.getFamiliesWithMembers(season);
      this.families.set((familiesData ?? []) as unknown as Family[]);
    } catch (error) {
      console.error('Error loading adopted items:', error);
      this.error.set(
        "We couldn't load your adoptions. Check your connection and try again.",
      );
    } finally {
      this.isLoading.set(false);
      afterNextRender(() => this.animateChanges.set(true), {
        injector: this.injector,
      });
    }
  }

  navigateToAdoptFamily() {
    this.router.navigate(['/adopt-family']);
  }
}
