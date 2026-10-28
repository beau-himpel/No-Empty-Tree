import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useAdoptions } from '../../lib/adoption';
import { titleCase } from '../../lib/text';
import type { FamilyMember } from '../../lib/types';
import { ExpandCollapse } from '../../shared/animations';
import { PERSON_TONE_TEXT, PersonBadge, personTone, roleLabel } from '../../shared/PersonBadge';
import { WishItem } from '../wish-item/WishItem';
import './MemberDetails.css';

export function MemberDetails({
  member,
  showAdoptionStatus = true,
  animateItems = false,
}: {
  member: FamilyMember;
  /** Off where every item shown is already the viewer's own, e.g. My Adoptions. */
  showAdoptionStatus?: boolean;
  /** Animate gifts entering/leaving the list (My Adoptions removals and undo). */
  animateItems?: boolean;
}) {
  useAdoptions();
  const [isCollapsed, setIsCollapsed] = useState(true);
  /** Clip the wish list while closed or moving; unclipped once open so focus rings show. */
  const [clipContent, setClipContent] = useState(true);

  const tone = personTone(member.is_parent, member.sex);
  const items = member.wishlist_items || [];
  const adopted = items.filter((item) => item.is_adopted).length;
  const total = items.length;
  const remaining = total - adopted;
  const allAdopted = total > 0 && adopted === total;
  /** Read out in place of the badge, which is decorative. */
  const ageLabel = member.age === 0 ? 'under 1 year old' : `${member.age} ${member.age === 1 ? 'year' : 'years'} old`;

  const toggleWishlist = () => {
    setClipContent(true);
    setIsCollapsed((value) => !value);
  };

  const itemRows = items.map((item) =>
    animateItems ? (
      <ExpandCollapse key={item.id}>
        <WishItem item={item} showAdoptionStatus={showAdoptionStatus} />
      </ExpandCollapse>
    ) : (
      <WishItem key={item.id} item={item} showAdoptionStatus={showAdoptionStatus} />
    )
  );

  return (
    <div className="w-full">
      <button
        type="button"
        className="group flex w-full items-center gap-3 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600"
        onClick={(event) => {
          event.stopPropagation();
          toggleWishlist();
        }}
        aria-expanded={!isCollapsed}
      >
        <PersonBadge
          className="transition-transform duration-150 group-active:scale-95"
          age={member.age}
          tone={tone}
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.0625rem] font-semibold tracking-snug text-stone-900">
            {titleCase(member.first_name)}
          </span>
          <span className={`block text-sm font-semibold ${PERSON_TONE_TEXT[tone]}`}>
            {roleLabel(member.is_parent, member.sex)}
            <span className="sr-only">, {ageLabel}</span>
          </span>
        </span>

        <span className="min-w-[4.75rem] shrink-0 text-right">
          {total === 0 ? (
            <span className="block text-sm text-stone-400">No list yet</span>
          ) : !showAdoptionStatus ? (
            <span className="block text-[0.9375rem] font-semibold tabular-nums text-stone-900">
              {total} {total === 1 ? 'gift' : 'gifts'}
            </span>
          ) : allAdopted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-pine-50 px-2.5 py-1 text-[0.8125rem] font-semibold text-pine-700">
              <i className="pi pi-check text-[0.6875rem]" aria-hidden="true" />
              Adopted
            </span>
          ) : (
            <>
              <span className="block text-[0.9375rem] font-semibold tabular-nums text-stone-900">
                {remaining} left
              </span>
              <span className="block text-xs tabular-nums text-stone-500">
                of {total} {total === 1 ? 'gift' : 'gifts'}
              </span>
            </>
          )}
        </span>

        <i
          className={`pi pi-chevron-down shrink-0 text-sm text-stone-400 transition-transform duration-300 ease-out ${
            isCollapsed ? '' : 'rotate-180'
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        className={`wishlist grid ${isCollapsed ? '' : 'wishlist-open'}`}
        inert={isCollapsed}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && !isCollapsed) setClipContent(false);
        }}
      >
        {/* Padding lives inside the collapsing box; on the box itself it would stay visible when closed */}
        <div className={`wishlist-content min-h-0 ${clipContent ? 'overflow-hidden' : ''}`}>
          <div className="divide-y divide-stone-100 pb-2 pl-14">
            {items.length === 0 ? (
              <p className="py-3 text-sm text-stone-400">No wish list items for this family member yet.</p>
            ) : animateItems ? (
              <AnimatePresence initial={false}>{itemRows}</AnimatePresence>
            ) : (
              itemRows
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
