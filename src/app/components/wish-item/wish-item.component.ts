import { Component, inject, input, output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { WishItem, Family } from '../../shared/types';
import { AuthService } from '../../auth.service';
import { ItemInfoComponent } from '../item-info/item-info.component';

@Component({
  selector: 'app-wish-item',
  standalone: true,
  imports: [ButtonModule, ItemInfoComponent, TitleCasePipe],
  templateUrl: './wish-item.component.html',
  styleUrls: ['./wish-item.component.scss']
})
export class WishItemComponent {
  item = input.required<WishItem>();
  family = input.required<Family>();
  showAdoptedInfo = input<boolean>(false);
  
  adoptItem = output<{item: WishItem, family: Family}>();
  unadoptItem = output<{item: WishItem, family: Family}>();

  private readonly authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  onAdoptItem() {
    this.adoptItem.emit({ item: this.item(), family: this.family() });
  }

  onUnadoptItem() {
    this.unadoptItem.emit({ item: this.item(), family: this.family() });
  }

  isAdoptedByCurrentUser(): boolean {
    const user = this.currentUser();
    return this.item().is_adopted && this.item().adopted_by === user?.id;
  }
}
