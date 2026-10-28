export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

export function isMobile(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 767px)').matches;
}

/** JS twin of a CSS cubic-bezier() timing function, for motion driven frame by frame. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const sample = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Bisect for the curve parameter whose x matches; 20 steps is far below a pixel
    let low = 0;
    let high = 1;
    let t = x;
    for (let i = 0; i < 20; i++) {
      t = (low + high) / 2;
      if (sample(x1, x2, t) < x) low = t;
      else high = t;
    }
    return sample(y1, y2, t);
  };
}

/** Eases in and out, so a large panel never lurches; shared with the scroll that follows it. */
export const PANEL_EASE_POINTS = [0.45, 0, 0.2, 1] as const;
export const PANEL_EASE = `cubic-bezier(${PANEL_EASE_POINTS.join(', ')})`;
export const PANEL_OPEN_MS = 560;
export const PANEL_CLOSE_MS = 380;
