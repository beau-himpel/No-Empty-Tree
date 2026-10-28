import type { WishItem } from '../../lib/types';
import type { Item } from '../nominate-family/nomination.model';

export function ItemInfo({
  item,
  muted = false,
  className = '',
}: {
  item: WishItem | Item;
  /** De-emphasize the description, e.g. once someone else has adopted the item. */
  muted?: boolean;
  className?: string;
}) {
  const metaLine = [item.color, item.size ? `Size ${item.size}` : null].filter(Boolean).join(' · ');

  return (
    <div className={`min-w-0 flex-1 ${className}`}>
      <p className="text-sm text-stone-500">{item.category}</p>
      <p
        className={`mt-0.5 text-[0.9375rem] font-semibold leading-snug tracking-snug transition-colors ${
          muted ? 'text-stone-400' : 'text-stone-900'
        }`}
      >
        {item.description}
      </p>
      {metaLine && <p className="mt-0.5 text-sm text-stone-500">{metaLine}</p>}
      {item.details && <p className="mt-1 text-sm leading-relaxed text-stone-500">{item.details}</p>}
      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-pine-700 hover:text-pine-800 hover:underline"
        >
          View item
          <i className="pi pi-arrow-up-right text-[0.6875rem]" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
