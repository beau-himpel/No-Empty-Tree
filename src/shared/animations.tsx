import { m, type HTMLMotionProps } from 'framer-motion';
import { prefersReducedMotion } from '../lib/motion';

const EASE_OUT = [0.2, 0, 0, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

/**
 * Height + fade for content that is inserted into or removed from a list.
 * Must be a direct child of framer-motion's <AnimatePresence>, inside the app's <LazyMotion>.
 */
export function ExpandCollapse({ style, ...props }: HTMLMotionProps<'div'>) {
  const instant = prefersReducedMotion();
  return (
    <m.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1, transition: { duration: instant ? 0 : 0.32, ease: EASE_OUT } }}
      exit={{ height: 0, opacity: 0, transition: { duration: instant ? 0 : 0.22, ease: EASE_IN } }}
      style={{ overflow: 'hidden', ...style }}
      {...props}
    />
  );
}
