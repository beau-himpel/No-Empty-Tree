import { NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AdoptionService } from '../../adoption.service';
import { BreakpointService } from '../../breakpoint.service';
import { NominationSettingsService } from '../../nomination-settings.service';
import { AnimatedNumberComponent } from '../../shared/animated-number.component';
import { FamilyTabComponent } from '../../shared/family-tab.component';
import { PANEL_EASE_POINTS, PANEL_OPEN_MS, panelExpand } from '../../shared/animations';
import { cubicBezier, prefersReducedMotion } from '../../shared/motion';
import { Family } from '../../shared/types';
import { SupabaseService } from '../../supabase.service';
import { FamilyDetailsComponent } from '../family-details/family-details.component';

// Height of the sticky app header; rows stick and scroll-align just below it
const HEADER_OFFSET_PX = 64;
const MAX_STAGGERED_ROWS = 10;
// Same curve and length as the panel opening, so both move as one
const revealEase = cubicBezier(...PANEL_EASE_POINTS);

export interface FamilyRow {
  info: Family;
  summary: string;
  totalGifts: number;
  adoptedGifts: number;
  remaining: number;
  progressPct: number;
  fullyAdopted: boolean;
}

@Component({
  selector: 'app-adopt-family',
  standalone: true,
  imports: [FamilyDetailsComponent, TitleCasePipe, AnimatedNumberComponent, NgTemplateOutlet, FamilyTabComponent],
  templateUrl: './adopt-family.component.html',
  styleUrls: ['./adopt-family.component.scss'],
  animations: [panelExpand],
})
export class AdoptFamilyComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private glideFrame = 0;
  private readonly supabaseService = inject(SupabaseService);
  private readonly adoptionService = inject(AdoptionService);
  private readonly breakpointService = inject(BreakpointService);
  private readonly nominationSettingsService = inject(NominationSettingsService);

  readonly selectedFamilyId = signal<string | null>(null);
  readonly suppressAnimations = signal(false);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly availableFamilies = signal<Family[]>([]);
  readonly nominationsEnabled = this.nominationSettingsService.nominationsEnabled;
  readonly isMobile = this.breakpointService.isMobile;

  /** Grouping is decided once per load so rows never move while someone is adopting. */
  private readonly groupOrder = signal<{ needs: string[]; done: string[] }>({
    needs: [],
    done: [],
  });

  private readonly rowsById = computed(() => {
    this.adoptionService.version();
    return new Map(
      this.availableFamilies().map((family) => [family.id, this.toRow(family)])
    );
  });

  readonly needsRows = computed(() => this.rowsFor(this.groupOrder().needs));
  readonly doneRows = computed(() => this.rowsFor(this.groupOrder().done));

  readonly totals = computed(() => {
    const rows = [...this.rowsById().values()];
    const totalGifts = rows.reduce((sum, row) => sum + row.totalGifts, 0);
    const adoptedGifts = rows.reduce((sum, row) => sum + row.adoptedGifts, 0);
    return {
      families: rows.length,
      totalGifts,
      adoptedGifts,
      remaining: totalGifts - adoptedGifts,
      progressPct: totalGifts === 0 ? 0 : (adoptedGifts / totalGifts) * 100,
    };
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopGlide());
  }

  ngOnInit() {
    this.loadFamilies();
  }

  async loadFamilies() {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const familiesData = (await this.supabaseService.getFamiliesWithMembers()) as unknown as Family[];
      this.availableFamilies.set(familiesData);

      const rows = familiesData.map((family) => this.toRow(family));
      this.groupOrder.set({
        needs: rows.filter((row) => !row.fullyAdopted).map((row) => row.info.id),
        done: rows.filter((row) => row.fullyAdopted).map((row) => row.info.id),
      });
    } catch (err) {
      this.error.set("We couldn't load families. Check your connection and try again.");
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Celebrate a family finished while this page was open; ones already done just show it. */
  completedThisVisit(row: FamilyRow): boolean {
    return row.fullyAdopted && !this.groupOrder().done.includes(row.info.id);
  }

  staggerDelay(index: number): number {
    return Math.min(index, MAX_STAGGERED_ROWS) * 40;
  }

  viewFamilyDetails(family: Family) {
    const openId = this.selectedFamilyId();
    const row = this.rowElement(family.id);

    if (openId === family.id) {
      // If the header is stuck to the top, return the row to its natural position
      // first; it then sits exactly where the stuck header was, so nothing jumps.
      if (row && row.getBoundingClientRect().top < HEADER_OFFSET_PX) {
        row.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
      this.selectedFamilyId.set(null);
      return;
    }

    if (!openId) {
      this.selectedFamilyId.set(family.id);
      this.revealRow(family.id);
      return;
    }

    // Switching families: close the open one instantly and offset the scroll by the
    // height it gave up, so the tapped row stays exactly under the user's finger.
    const topBefore = row?.getBoundingClientRect().top ?? 0;
    this.suppressAnimations.set(true);
    this.selectedFamilyId.set(null);

    afterNextRender(
      () => {
        const topAfter = this.rowElement(family.id)?.getBoundingClientRect().top ?? topBefore;
        window.scrollBy({ top: topAfter - topBefore, behavior: 'instant' });
        this.suppressAnimations.set(false);
        this.selectedFamilyId.set(family.id);
        this.revealRow(family.id);
      },
      { injector: this.injector }
    );
  }

  /** Brings a newly opened row to the top when its details would otherwise be off screen. */
  private revealRow(familyId: string) {
    afterNextRender(
      () => {
        const row = this.rowElement(familyId);
        if (!row) return;
        const top = row.getBoundingClientRect().top;
        const isWellPlaced = Math.abs(top - HEADER_OFFSET_PX) < 4;
        const isLowOnScreen = top > window.innerHeight * 0.45;
        // Mobile keeps the original behavior of always bringing the selection into view
        if (!isWellPlaced && (this.isMobile() || isLowOnScreen)) {
          this.glideScrollTo(window.scrollY + top - HEADER_OFFSET_PX);
        }
      },
      { injector: this.injector }
    );
  }

  /**
   * Scrolls in step with the panel opening, as one motion. The page isn't tall
   * enough for the target until the panel has grown, so each frame aims as far
   * as the page currently allows. Any user scroll takes over immediately.
   */
  private glideScrollTo(target: number) {
    this.stopGlide();
    if (prefersReducedMotion()) {
      window.scrollTo({ top: target, behavior: 'instant' });
      return;
    }

    const start = window.scrollY;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / PANEL_OPEN_MS);
      const eased = revealEase(progress);
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: Math.min(start + (target - start) * eased, maxScroll), behavior: 'instant' });
      if (progress < 1) {
        this.glideFrame = requestAnimationFrame(step);
      } else {
        this.stopGlide();
      }
    };
    window.addEventListener('wheel', this.stopGlide, { passive: true });
    window.addEventListener('touchstart', this.stopGlide, { passive: true });
    this.glideFrame = requestAnimationFrame(step);
  }

  private readonly stopGlide = () => {
    cancelAnimationFrame(this.glideFrame);
    window.removeEventListener('wheel', this.stopGlide);
    window.removeEventListener('touchstart', this.stopGlide);
  };

  navigateToNominate() {
    this.router.navigate(['/nominate-family']);
  }

  private rowElement(familyId: string): HTMLElement | null {
    return document.getElementById(`family-${familyId}`);
  }

  private rowsFor(ids: string[]): FamilyRow[] {
    const rows = this.rowsById();
    return ids.map((id) => rows.get(id)).filter((row): row is FamilyRow => !!row);
  }

  private toRow(family: Family): FamilyRow {
    const members = family.family_members;
    const adults = members.filter((member) => member.is_parent).length;
    const boys = members.filter((member) => !member.is_parent && member.sex === 'male').length;
    const girls = members.filter((member) => !member.is_parent && member.sex === 'female').length;
    const otherChildren = members.filter(
      (member) => !member.is_parent && member.sex !== 'male' && member.sex !== 'female'
    ).length;

    const summaryParts: string[] = [];
    if (adults > 0) summaryParts.push(`${adults} ${adults === 1 ? 'adult' : 'adults'}`);
    if (boys > 0) summaryParts.push(`${boys} ${boys === 1 ? 'boy' : 'boys'}`);
    if (girls > 0) summaryParts.push(`${girls} ${girls === 1 ? 'girl' : 'girls'}`);
    if (otherChildren > 0) {
      summaryParts.push(`${otherChildren} ${otherChildren === 1 ? 'child' : 'children'}`);
    }

    const items = members.flatMap((member) => member.wishlist_items || []);
    const adoptedGifts = items.filter((item) => item.is_adopted).length;
    const totalGifts = items.length;

    return {
      info: family,
      summary: summaryParts.join(' · '),
      totalGifts,
      adoptedGifts,
      remaining: totalGifts - adoptedGifts,
      progressPct: totalGifts === 0 ? 0 : (adoptedGifts / totalGifts) * 100,
      fullyAdopted: totalGifts > 0 && adoptedGifts === totalGifts,
    };
  }
}
