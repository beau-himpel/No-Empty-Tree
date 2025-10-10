import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { WishItem, Family } from '../../shared/types';

@Component({
  selector: 'app-wish-item',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './wish-item.component.html',
  styleUrls: ['./wish-item.component.scss']
})
export class WishItemComponent {
  item = input.required<WishItem>();
  family = input.required<Family>();
  currentUser = input<string | null>(null);
  showAdoptedInfo = input<boolean>(false);
  
  adoptItem = output<{item: WishItem, family: Family}>();
  unadoptItem = output<{item: WishItem, family: Family}>();

  onAdoptItem() {
    this.adoptItem.emit({ item: this.item(), family: this.family() });
  }

  onUnadoptItem() {
    this.unadoptItem.emit({ item: this.item(), family: this.family() });
  }

  isAdoptedByCurrentUser(): boolean {
    const user = this.currentUser();
    console.log(this.item().is_adopted, this.item().adopted_by, user);
    return this.item().is_adopted && this.item().adopted_by === user;
  }
}
