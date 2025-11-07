import {
  Component,
  input,
  output,
  signal,
  inject,
} from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FamilyMember, WishItem } from '../../../shared/types';
import { WishItemComponent } from '../../wish-item/wish-item.component';
import { BreakpointService } from '../../../breakpoint.service';

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

  private readonly breakpointService = inject(BreakpointService);
  readonly isMobile = this.breakpointService.isMobile;
  
  isCollapsed = signal<boolean>(true);

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

