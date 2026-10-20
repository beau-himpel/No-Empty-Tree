import { animate, group, query, style, transition, trigger } from '@angular/animations';

const EASE_OUT = 'cubic-bezier(0.2, 0, 0, 1)';
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';
/** Eases in and out, so a large panel never lurches; shared with the scroll that follows it. */
export const PANEL_EASE_POINTS = [0.45, 0, 0.2, 1] as const;
export const PANEL_EASE = `cubic-bezier(${PANEL_EASE_POINTS.join(', ')})`;
export const PANEL_OPEN_MS = 560;
const PANEL_CLOSE_MS = 380;

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

/**
 * Opening a family's details: slower than list inserts because the panel is tall.
 * Height leads and the content fades in behind it, so nothing appears before it has room.
 */
export const panelExpand = trigger('panelExpand', [
  transition(':enter', [
    style({ height: 0, overflow: 'hidden' }),
    query(':scope > *', style({ opacity: 0 }), { optional: true }),
    group([
      animate(`${PANEL_OPEN_MS}ms ${PANEL_EASE}`, style({ height: '*' })),
      query(':scope > *', animate(`360ms 140ms ease-out`, style({ opacity: 1 })), { optional: true }),
    ]),
  ]),
  transition(':leave', [
    style({ height: '*', overflow: 'hidden' }),
    group([
      animate(`${PANEL_CLOSE_MS}ms ${PANEL_EASE}`, style({ height: 0 })),
      query(':scope > *', animate('200ms ease-in', style({ opacity: 0 })), { optional: true }),
    ]),
  ]),
]);
