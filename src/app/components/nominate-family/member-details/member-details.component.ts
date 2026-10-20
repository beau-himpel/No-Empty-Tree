import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdoptionService } from '../../../adoption.service';
import { expandCollapse } from '../../../shared/animations';
import { FamilyMember } from '../../../shared/types';
import { WishItemComponent } from '../../wish-item/wish-item.component';

@Component({
  selector: 'app-member-details',
  standalone: true,
  imports: [
    CommonModule,
    WishItemComponent,
  ],
  templateUrl: './member-details.component.html',
  styleUrls: ['./member-details.component.scss'],
  animations: [expandCollapse]
})
export class MemberDetailsComponent {
  member = input.required<FamilyMember>();
  /** Off where every item shown is already the viewer's own, e.g. My Adoptions. */
  showAdoptionStatus = input<boolean>(true);
  startExpanded = input<boolean>(false);
  /** Animate gifts entering/leaving the list (My Adoptions removals and undo). */
  animateItems = input<boolean>(false);

  private readonly adoptionService = inject(AdoptionService);

  // Collapse is plain CSS (grid rows), not an Angular animation state: state styles
  // are applied too late for a family panel that measures its height on enter.
  readonly isCollapsed = linkedSignal(() => !this.startExpanded());
  /** Clip the wish list while closed or moving; unclipped once open so focus rings show. */
  readonly clipContent = linkedSignal(() => !this.startExpanded());

  readonly roleLabel = computed(() => {
    const member = this.member();
    if (member.is_parent) {
      return member.sex === 'male' ? 'Man' : member.sex === 'female' ? 'Woman' : 'Adult';
    }
    return member.sex === 'male' ? 'Boy' : member.sex === 'female' ? 'Girl' : 'Child';
  });

  private readonly giftCounts = computed(() => {
    this.adoptionService.version();
    const items = this.member().wishlist_items || [];
    return {
      total: items.length,
      adopted: items.filter((item) => item.is_adopted).length,
    };
  });

  readonly allAdopted = computed(() => {
    const { total, adopted } = this.giftCounts();
    return total > 0 && adopted === total;
  });

  readonly metaLine = computed(() => {
    const { total, adopted } = this.giftCounts();
    const parts = [`${this.roleLabel()}, ${this.member().age}`];
    if (total === 0) {
      parts.push('No wish list yet');
    } else if (adopted === 0) {
      parts.push(`${total} ${total === 1 ? 'gift' : 'gifts'}`);
    } else if (adopted < total) {
      parts.push(`${total - adopted} of ${total} gifts left`);
    } else {
      parts.push(`${total} ${total === 1 ? 'gift' : 'gifts'}`);
    }
    return parts.join(' · ');
  });

  toggleWishlist(event: Event) {
    event.stopPropagation();
    this.clipContent.set(true);
    this.isCollapsed.update(value => !value);
  }

  onWishlistTransitionEnd(event: TransitionEvent) {
    if (event.target === event.currentTarget && !this.isCollapsed()) {
      this.clipContent.set(false);
    }
  }
}
