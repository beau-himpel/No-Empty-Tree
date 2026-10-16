import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { AdoptionService } from '../../adoption.service';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { Family, WishItem } from '../../shared/types';
import { MemberDetailsComponent } from '../nominate-family/member-details/member-details.component';

@Component({
  selector: 'app-family-details',
  standalone: true,
  imports: [MemberDetailsComponent],
  providers: [TitleCasePipe],
  templateUrl: './family-details.component.html',
  styleUrls: ['./family-details.component.scss'],
})
export class FamilyDetailsComponent {
  family = input<Family | null>(null);

  private readonly adoptionService = inject(AdoptionService);
  private readonly confirmService = inject(ConfirmService);
  private readonly titleCase = inject(TitleCasePipe);

  readonly adoptingAll = signal(false);

  readonly gifts = computed(() => {
    this.adoptionService.version();
    const items: WishItem[] =
      this.family()?.family_members.flatMap((member) => member.wishlist_items || []) ?? [];
    const remaining = items.filter((item) => !item.is_adopted);
    return {
      total: items.length,
      remaining,
      someAdopted: remaining.length < items.length,
      allAdopted: items.length > 0 && remaining.length === 0,
    };
  });

  readonly adoptAllLabel = computed(() => {
    const { remaining, someAdopted } = this.gifts();
    const count = remaining.length;
    if (count === 1) return someAdopted ? 'Adopt the last gift' : 'Adopt this gift';
    return someAdopted ? `Adopt remaining ${count} gifts` : `Adopt all ${count} gifts`;
  });

  async adoptAll(): Promise<void> {
    const family = this.family();
    if (!family || this.adoptingAll()) return;

    const { remaining, someAdopted } = this.gifts();
    const count = remaining.length;
    if (count === 0) return;

    const familyName = this.titleCase.transform(family.last_name);
    const confirmed = await this.confirmService.open({
      icon: 'pi-heart-fill',
      title:
        count === 1
          ? `Adopt the ${someAdopted ? 'last' : 'only'} gift?`
          : `Adopt ${someAdopted ? 'the remaining' : 'all'} ${count} gifts?`,
      message: `You're committing to buy ${
        count === 1 ? 'this gift' : `these ${count} gifts`
      } for the ${familyName} family. You'll find ${
        count === 1 ? 'it' : 'them'
      } in My Adoptions.`,
      confirmLabel: count === 1 ? 'Adopt gift' : `Adopt ${count} gifts`,
    });
    if (!confirmed) return;

    this.adoptingAll.set(true);
    try {
      await this.adoptionService.adopt(remaining);
    } finally {
      this.adoptingAll.set(false);
    }
  }
}
