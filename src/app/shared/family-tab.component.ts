import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * A family's name on a red tab whose base runs on as a thin bar to the right edge,
 * like a "P" turned on its side. Content is the name, e.g. "The Hernandez Family".
 */
@Component({
  selector: 'app-family-tab',
  standalone: true,
  template: `
    <span class="tab-label"
      ><span class="block truncate"><ng-content /></span
    ></span>
  `,
  host: { class: 'family-tab' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    :host {
      --tab-color: #d84e62; /* berry-500 */
      --bar-height: 5px; /* about 15% of the tab's height */
      --radius: 0.5rem;
      display: flex;
      align-items: flex-end;
      min-width: 0;
    }

    .tab-label {
      position: relative;
      min-width: 0;
      /* Leave room for the curve and a visible run of bar on narrow screens */
      max-width: calc(100% - 1.5rem);
      padding: 0.375rem 0.875rem 0.3125rem;
      /* Every corner rounded except bottom-right, where the tab runs into the bar */
      border-radius: var(--radius) var(--radius) 0 var(--radius);
      background: var(--tab-color);
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.375;
      letter-spacing: -0.011em;
    }

    /* Concave curve where the tab's right side meets the bar, so the two read as one shape */
    .tab-label::after {
      content: '';
      position: absolute;
      right: calc(var(--radius) * -1);
      bottom: 0;
      width: var(--radius);
      height: calc(var(--radius) + var(--bar-height));
      background: radial-gradient(
        circle at 100% 0,
        transparent calc(var(--radius) - 0.5px),
        var(--tab-color) var(--radius)
      );
    }

    /* The bar: from the tab's base to the far right */
    :host::after {
      content: '';
      flex: 1 1 0;
      min-width: 1rem;
      height: var(--bar-height);
      /* Round off the bar's far end */
      border-radius: 0 calc(var(--bar-height) / 2) calc(var(--bar-height) / 2) 0;
      background: var(--tab-color);
    }

    /* Printers drop backgrounds by default, which would leave white text on white */
    @media print {
      .tab-label {
        padding-left: 0;
        background: none;
        color: #000;
      }
      .tab-label::after {
        display: none;
      }
      :host::after {
        height: 1px;
        background: #000;
      }
    }
  `,
})
export class FamilyTabComponent {}
