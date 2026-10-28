import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';

/** Counts smoothly toward its value whenever the value changes. */
export function AnimatedNumber({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const set = (next: number) => {
      displayRef.current = next;
      setDisplay(next);
    };
    const from = displayRef.current;
    if (from === value || prefersReducedMotion()) {
      set(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 4);
      set(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span className="tabular-nums">{Math.round(display).toLocaleString()}</span>;
}
