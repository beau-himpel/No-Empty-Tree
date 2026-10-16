import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
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
  animations: [
    trigger('slideDown', [
      state('collapsed', style({ height: '0px', opacity: 0, overflow: 'hidden' })),
      state('expanded', style({ height: '*', opacity: 1, overflow: 'visible' })),
      transition('collapsed => expanded', animate('300ms cubic-bezier(0.2, 0, 0, 1)')),
      transition('expanded => collapsed', animate('220ms cubic-bezier(0.4, 0, 1, 1)'))
    ]),
    expandCollapse,
  ]
})
export class MemberDetailsComponent {
  member = input.required<FamilyMember>();
  /** Off where every item shown is already the viewer's own, e.g. My Adoptions. */
  showAdoptionStatus = input<boolean>(true);
  startExpanded = input<boolean>(false);

  private readonly adoptionService = inject(AdoptionService);

  readonly isCollapsed = linkedSignal(() => !this.startExpanded());

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
    this.isCollapsed.update(value => !value);
  }
}
