import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { PANEL_CLOSE_MS, PANEL_EASE, PANEL_OPEN_MS, prefersReducedMotion } from '../../lib/motion';

/**
 * Opening a family's details: slower than list inserts because the panel is tall.
 * Height leads and the content fades in behind it, so nothing appears before it has
 * room. When `open` turns false the panel animates closed, then calls `onClosed`.
 */
export function ExpandPanel({
  id,
  open,
  onClosed,
  children,
}: {
  id: string;
  open: boolean;
  onClosed: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const running = useRef<Animation[]>([]);

  useEffect(
    () => () => {
      running.current.forEach((animation) => animation.cancel());
      running.current = [];
    },
    []
  );

  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    const content = [...element.children] as HTMLElement[];
    // Reopened while still closing: grow from where it is rather than from nothing
    const from = running.current.length > 0 ? element.getBoundingClientRect().height : 0;
    running.current.forEach((animation) => animation.cancel());
    running.current = [];

    if (prefersReducedMotion()) {
      if (!open) onClosedRef.current();
      return;
    }

    let animations: Animation[];
    if (open) {
      const height = element.scrollHeight;
      animations = [
        element.animate(
          [
            { height: `${from}px`, overflow: 'hidden' },
            { height: `${height}px`, overflow: 'hidden' },
          ],
          { duration: PANEL_OPEN_MS, easing: PANEL_EASE }
        ),
        ...content.map((child) =>
          child.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 360,
            delay: 140,
            easing: 'ease-out',
            fill: 'backwards',
          })
        ),
      ];
    } else {
      const height = element.getBoundingClientRect().height;
      animations = [
        element.animate(
          [
            { height: `${height}px`, overflow: 'hidden' },
            { height: '0px', overflow: 'hidden' },
          ],
          { duration: PANEL_CLOSE_MS, easing: PANEL_EASE, fill: 'forwards' }
        ),
        ...content.map((child) =>
          child.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' })
        ),
      ];
      animations[0].onfinish = () => onClosedRef.current();
    }

    running.current = animations;
    animations[0].onfinish ??= () => (running.current = []);
  }, [open]);

  return (
    <div id={id} ref={panel}>
      {children}
    </div>
  );
}
