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

  readonly metaLine = computed(() => {
    const member = this.member();
    const items = member.wishlist_items || [];
    const adopted = items.filter((item) => item.is_adopted).length;

    const parts = [`${this.roleLabel()} · Age ${member.age}`];
    if (items.length === 0) {
      parts.push('No wish list items');
    } else {
      parts.push(`${items.length} ${items.length === 1 ? 'gift' : 'gifts'}`);
      if (adopted > 0) {
        parts.push(`${adopted} adopted`);
      }
    }
    return parts.join(' · ');
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
