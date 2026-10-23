import { Component, computed, input } from '@angular/core';
import { WishItem } from '../../shared/types';
import { Item } from '../nominate-family/nomination.model';

@Component({
  selector: 'app-item-info',
  standalone: true,
  templateUrl: './item-info.component.html',
  styleUrls: ['./item-info.component.scss']
})
export class ItemInfoComponent {
  item = input.required<WishItem | Item>();
  /** De-emphasize the description, e.g. once someone else has adopted the item. */
  muted = input<boolean>(false);

  readonly metaLine = computed(() => {
    const item = this.item();
    return [item.color, item.size ? `Size ${item.size}` : null]
      .filter(Boolean)
      .join(' · ');
  });
}
