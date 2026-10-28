import { useState } from 'react';
import { adopt, isAdoptedByCurrentUser, unadopt, useAdoptions } from '../../lib/adoption';
import { titleCase } from '../../lib/text';
import type { WishItem as WishItemData } from '../../lib/types';
import { ItemInfo } from '../item-info/ItemInfo';

export function WishItem({ item, showAdoptionStatus = true }: { item: WishItemData; showAdoptionStatus?: boolean }) {
  const { pendingIds } = useAdoptions();
  /** Set only when the current user adopts during this visit, so the confirmation animates once. */
  const [justAdopted, setJustAdopted] = useState(false);

  const status: 'open' | 'mine' | 'taken' = !item.is_adopted
    ? 'open'
    : isAdoptedByCurrentUser(item)
      ? 'mine'
      : 'taken';
  const pending = pendingIds.has(item.id);

  const onAdopt = async () => {
    const adopted = await adopt([item]);
    setJustAdopted(adopted > 0);
  };

  const onRemove = () => {
    setJustAdopted(false);
    unadopt(item);
  };

  return (
    <div className="flex items-start gap-4 py-4">
      <div className="min-w-0 flex-1">
        <ItemInfo item={item} muted={status === 'taken'} />

        {status === 'mine' && showAdoptionStatus ? (
          <p
            className={`mt-2 flex items-center gap-1.5 text-sm font-semibold text-berry-700 ${
              justAdopted ? 'animate-fade-up' : ''
            }`}
          >
            <i className={`pi pi-heart-fill text-[0.75rem] ${justAdopted ? 'animate-pop' : ''}`} aria-hidden="true" />
            Adopted by you
          </p>
        ) : status === 'taken' ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-stone-400">
            <i className="pi pi-check text-[0.75rem]" aria-hidden="true" />
            Adopted by {titleCase(item.adopted_by_name?.full_name) || 'another donor'}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-end pt-0.5">
        {status === 'open' ? (
          <button
            type="button"
            className="btn-adopt btn-sm min-w-[5.75rem]"
            disabled={pending}
            onClick={onAdopt}
            aria-label={`Adopt ${item.description}`}
          >
            {pending ? (
              <i className="pi pi-spin pi-spinner text-sm" aria-hidden="true" />
            ) : (
              <>
                <i className="pi pi-heart-fill text-xs" aria-hidden="true" />
                Adopt
              </>
            )}
          </button>
        ) : status === 'mine' ? (
          <button
            type="button"
            className={`btn-quiet btn-sm min-w-[5.75rem] ${justAdopted ? 'animate-fade-in' : ''}`}
            disabled={pending}
            onClick={onRemove}
            aria-label={`Remove ${item.description} from my adoptions`}
          >
            {pending ? <i className="pi pi-spin pi-spinner text-sm" aria-hidden="true" /> : 'Remove'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
