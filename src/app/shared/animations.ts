import { animate, style, transition, trigger } from '@angular/animations';

const EASE_OUT = 'cubic-bezier(0.2, 0, 0, 1)';
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';

/** Height + fade for content that is inserted into or removed from a list. */
export const expandCollapse = trigger('expandCollapse', [
  transition(':enter', [
    style({ height: 0, opacity: 0, overflow: 'hidden' }),
    animate(`320ms ${EASE_OUT}`, style({ height: '*', opacity: 1 })),
  ]),
  transition(':leave', [
    style({ height: '*', opacity: 1, overflow: 'hidden' }),
    animate(`220ms ${EASE_IN}`, style({ height: 0, opacity: 0 })),
  ]),
]);
