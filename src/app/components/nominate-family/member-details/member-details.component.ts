import { Component, computed, input, output, signal } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FamilyMember, WishItem } from '../../../shared/types';
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
      transition('collapsed <=> expanded', animate('300ms ease-in-out'))
    ])
  ]
})
export class MemberDetailsComponent {
  member = input.required<FamilyMember>();
  showAllAdoptedMessage = input<boolean>(true);

  adoptItem = output<WishItem>();
  unadoptItem = output<WishItem>();

  isCollapsed = signal<boolean>(true);

  readonly roleLabel = computed(() => {
    const member = this.member();
    if (member.is_parent) {
      return member.sex === 'male' ? 'Man' : member.sex === 'female' ? 'Woman' : 'Adult';
    }
    return member.sex === 'male' ? 'Boy' : member.sex === 'female' ? 'Girl' : 'Child';
  });

  readonly roleChipClass = computed(() => {
    const member = this.member();
    if (member.is_parent) return 'chip-adult';
    if (member.sex === 'male') return 'chip-boy';
    if (member.sex === 'female') return 'chip-girl';
    return 'chip-neutral';
  });

  readonly giftCounts = computed(() => {
    const items = this.member().wishlist_items || [];
    return {
      total: items.length,
      adopted: items.filter((item) => item.is_adopted).length,
    };
  });

  isAllItemsAdopted(member: FamilyMember): boolean {
    return (
      (member.wishlist_items?.length || 0) > 0 &&
      (member.wishlist_items?.every((item) => item.is_adopted) || false)
    );
  }

  toggleWishlist(event: Event) {
    event.stopPropagation();
    this.isCollapsed.update(value => !value);
  }
}
