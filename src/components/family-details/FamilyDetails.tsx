import { useState } from 'react';
import { adopt, useAdoptions } from '../../lib/adoption';
import { titleCase } from '../../lib/text';
import type { Family } from '../../lib/types';
import { confirm } from '../../shared/confirm';
import { MemberDetails } from '../member-details/MemberDetails';

export function FamilyDetails({ family }: { family: Family }) {
  useAdoptions();
  const [adoptingAll, setAdoptingAll] = useState(false);

  const items = family.family_members.flatMap((member) => member.wishlist_items || []);
  const remaining = items.filter((item) => !item.is_adopted);
  const someAdopted = remaining.length < items.length;
  const allAdopted = items.length > 0 && remaining.length === 0;
  const count = remaining.length;

  const adoptAllLabel =
    count === 1
      ? someAdopted
        ? 'Adopt the last gift'
        : 'Adopt this gift'
      : someAdopted
        ? `Adopt remaining ${count} gifts`
        : `Adopt all ${count} gifts`;

  const adoptAll = async () => {
    if (adoptingAll || count === 0) return;

    const confirmed = await confirm({
      icon: 'pi-heart-fill',
      title:
        count === 1
          ? `Adopt the ${someAdopted ? 'last' : 'only'} gift?`
          : `Adopt ${someAdopted ? 'the remaining' : 'all'} ${count} gifts?`,
      message: `You're committing to buy ${count === 1 ? 'this gift' : `these ${count} gifts`} for the ${titleCase(
        family.last_name
      )} family. You'll find ${count === 1 ? 'it' : 'them'} in My Adoptions.`,
      confirmLabel: count === 1 ? 'Adopt gift' : `Adopt ${count} gifts`,
    });
    if (!confirmed) return;

    setAdoptingAll(true);
    try {
      await adopt(remaining);
    } finally {
      setAdoptingAll(false);
    }
  };

  return (
    <div className="pb-8 pt-6">
      {allAdopted ? (
        <div className="flex items-center justify-center gap-3 py-1 animate-fade-up">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-700 text-white animate-pop"
            aria-hidden="true"
          >
            <i className="pi pi-check text-sm" />
          </span>
          <div>
            <p className="font-semibold tracking-snug text-stone-900">Every gift has been adopted</p>
            <p className="text-sm text-stone-500">Thank you for making this family's holiday.</p>
          </div>
        </div>
      ) : items.length > 0 ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="btn-adopt btn-lg w-full sm:w-auto sm:min-w-[18rem]"
            disabled={adoptingAll}
            onClick={adoptAll}
          >
            {adoptingAll ? (
              <>
                <i className="pi pi-spin pi-spinner" aria-hidden="true" />
                Adopting…
              </>
            ) : (
              <>
                <i className="pi pi-heart-fill text-sm" aria-hidden="true" />
                {adoptAllLabel}
              </>
            )}
          </button>
        </div>
      ) : (
        <p className="py-2 text-center text-sm text-stone-500">This family doesn't have any wish list items yet.</p>
      )}

      <div className="mt-6 divide-y divide-stone-100 border-t border-stone-100">
        {family.family_members.map((member) => (
          <MemberDetails key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}
