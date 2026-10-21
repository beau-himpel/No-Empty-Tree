import { Component } from '@angular/core';

/**
 * A family's name on a red tab whose base runs on as a thin bar to the right edge,
 * like a "P" turned on its side. Content is the name, e.g. "The Hernandez Family".
 */
@Component({
  selector: 'app-family-tab',
  standalone: true,
  template: `
    <span class="tab-label"><span class="block truncate"><ng-content /></span></span>
  `,
  host: { class: 'family-tab' },
  styles: `
    :host {
      --tab-color: #d84e62; /* berry-500 */
      --bar-height: 3px;
      display: flex;
      align-items: flex-end;
      min-width: 0;
    }

    .tab-label {
      min-width: 0;
      /* Leave a visible run of bar on narrow screens */
      max-width: calc(100% - 1.25rem);
      padding: 0.375rem 0.875rem 0.3125rem;
      background: var(--tab-color);
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.375;
      letter-spacing: -0.011em;
    }

    /* The bar: from the tab's base to the far right */
    :host::after {
      content: '';
      flex: 1 1 0;
      min-width: 1rem;
      height: var(--bar-height);
      background: var(--tab-color);
    }

    /* Printers drop backgrounds by default, which would leave white text on white */
    @media print {
      .tab-label {
        padding-left: 0;
        background: none;
        color: #000;
      }
      :host::after {
        height: 1px;
        background: #000;
      }
    }
  `,
})
export class FamilyTabComponent {}
