import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdoptionService } from '../../../adoption.service';
import { expandCollapse } from '../../../shared/animations';
import { PERSON_TONE_TEXT, PersonBadgeComponent, personTone } from '../../../shared/person-badge.component';
import { FamilyMember } from '../../../shared/types';
import { WishItemComponent } from '../../wish-item/wish-item.component';

@Component({
  selector: 'app-member-details',
  standalone: true,
  imports: [
    CommonModule,
    WishItemComponent,
    PersonBadgeComponent,
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

  readonly tone = computed(() => personTone(this.member().is_parent, this.member().sex));
  readonly roleTextClass = computed(() => PERSON_TONE_TEXT[this.tone()]);

  readonly roleLabel = computed(() => {
    const member = this.member();
    if (member.is_parent) {
      return member.sex === 'male' ? 'Man' : member.sex === 'female' ? 'Woman' : 'Adult';
    }
    return member.sex === 'male' ? 'Boy' : member.sex === 'female' ? 'Girl' : 'Child';
  });

  /** Read out in place of the badge, which is decorative. */
  readonly ageLabel = computed(() => {
    const age = this.member().age;
    return age === 0 ? 'under 1 year old' : `${age} ${age === 1 ? 'year' : 'years'} old`;
  });

  readonly giftCounts = computed(() => {
    this.adoptionService.version();
    const items = this.member().wishlist_items || [];
    const adopted = items.filter((item) => item.is_adopted).length;
    return { total: items.length, adopted, remaining: items.length - adopted };
  });

  readonly allAdopted = computed(() => {
    const { total, adopted } = this.giftCounts();
    return total > 0 && adopted === total;
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
