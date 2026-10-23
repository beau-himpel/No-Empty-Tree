import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { NominationSettingsService } from '../../nomination-settings.service';
import { ChoiceGroupComponent, ChoiceOption } from '../../shared/choice-group.component';
import { FamilyTabComponent } from '../../shared/family-tab.component';
import { Family } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';
import { ItemInfoComponent } from '../item-info/item-info.component';
import { adoptedBy, giftCount, memberLine } from '../my-adoptions/adopted-by';

interface PastSeason {
  season: number;
  families: Family[];
  gifts: number;
}

/** What the signed-in donor adopted in earlier seasons, by year, then family, then person. */
@Component({
  selector: 'app-past-adoptions',
  standalone: true,
  imports: [
    RouterLink,
    TitleCasePipe,
    ReactiveFormsModule,
    ChoiceGroupComponent,
    FamilyTabComponent,
    ItemInfoComponent,
  ],
  templateUrl: './past-adoptions.component.html',
})
export class PastAdoptionsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly nominationSettings = inject(NominationSettingsService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  private readonly families = signal<Family[]>([]);

  readonly memberLine = memberLine;

  /** Newest season first; families arrive A–Z within each season. */
  readonly seasons = computed<PastSeason[]>(() => {
    const bySeason = new Map<number, Family[]>();
    for (const family of adoptedBy(this.families(), this.authService.currentUser()?.id)) {
      bySeason.set(family.season, [...(bySeason.get(family.season) ?? []), family]);
    }
    return [...bySeason.entries()]
      .sort(([a], [b]) => b - a)
      .map(([season, families]) => ({ season, families, gifts: giftCount(families) }));
  });

  /** null shows every year. */
  readonly yearControl = new FormControl<number | null>(null);
  private readonly selectedYear = toSignal(this.yearControl.valueChanges, { initialValue: null });

  readonly yearOptions = computed<ChoiceOption<number | null>[]>(() => [
    { label: 'All years', value: null },
    ...this.seasons().map((s) => ({ label: String(s.season), value: s.season })),
  ]);

  readonly visibleSeasons = computed(() => {
    const year = this.selectedYear();
    return year === null ? this.seasons() : this.seasons().filter((s) => s.season === year);
  });

  readonly totals = computed(() => ({
    gifts: this.seasons().reduce((sum, s) => sum + s.gifts, 0),
    seasons: this.seasons().length,
  }));

  ngOnInit() {
    this.load();
  }

  async load() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const season = await this.nominationSettings.currentSeason();
      const familiesData = await this.supabaseService.getFamiliesBeforeSeason(season);
      this.families.set((familiesData ?? []) as unknown as Family[]);
    } catch {
      this.error.set("We couldn't load your past adoptions. Check your connection and try again.");
    } finally {
      this.isLoading.set(false);
    }
  }
}
