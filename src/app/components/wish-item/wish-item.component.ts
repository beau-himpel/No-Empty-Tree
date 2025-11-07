import { TitleCasePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../auth.service';
import { WishItem } from '../../shared/types';
import { ItemInfoComponent } from '../item-info/item-info.component';

@Component({
  selector: 'app-wish-item',
  standalone: true,
  imports: [ButtonModule, ItemInfoComponent, DialogModule, TitleCasePipe],
  templateUrl: './wish-item.component.html',
  styleUrls: ['./wish-item.component.scss']
})
export class WishItemComponent {
  item = input.required<WishItem>();
  showAdoptedInfo = input<boolean>(false);
  showUnadoptConfirmationModal = signal<boolean>(false);

  adoptItem = output();
  unadoptItem = output();

  private readonly authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  isAdoptedByCurrentUser(): boolean {
    const user = this.currentUser();
    return this.item().is_adopted && this.item().adopted_by === user?.id;
  }
}
