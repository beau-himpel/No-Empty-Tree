import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { AdoptionService } from '../../adoption.service';
import { WishItem } from '../../shared/types';
import { ItemInfoComponent } from '../item-info/item-info.component';

@Component({
  selector: 'app-wish-item',
  standalone: true,
  imports: [ItemInfoComponent, TitleCasePipe],
  templateUrl: './wish-item.component.html',
  styleUrls: ['./wish-item.component.scss']
})
export class WishItemComponent {
  item = input.required<WishItem>();
  showAdoptionStatus = input<boolean>(true);

  private readonly adoptionService = inject(AdoptionService);

  /** Set only when the current user adopts during this visit, so the confirmation animates once. */
  readonly justAdopted = signal(false);

  readonly status = computed<'open' | 'mine' | 'taken'>(() => {
    this.adoptionService.version();
    const item = this.item();
    if (!item.is_adopted) return 'open';
    return this.adoptionService.isAdoptedByCurrentUser(item) ? 'mine' : 'taken';
  });

  readonly pending = computed(() => this.adoptionService.isPending(this.item().id));

  async adopt(): Promise<void> {
    const adopted = await this.adoptionService.adopt([this.item()]);
    this.justAdopted.set(adopted > 0);
  }

  remove(): void {
    this.justAdopted.set(false);
    this.adoptionService.unadopt(this.item());
  }
}
