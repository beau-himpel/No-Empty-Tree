import type { ReactNode } from 'react';
import './FamilyTab.css';

/**
 * A family's name on a red tab whose base runs on as a thin bar to the right edge,
 * like a "P" turned on its side. Content is the name, e.g. "The Hernandez Family".
 */
export function FamilyTab({ children }: { children: ReactNode }) {
  return (
    <span className="family-tab">
      <span className="family-tab-label">
        <span className="block truncate">{children}</span>
      </span>
    </span>
  );
}
