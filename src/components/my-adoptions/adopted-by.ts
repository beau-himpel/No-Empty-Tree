import { roleLabel } from '../../shared/PersonBadge';
import type { Family, FamilyMember, WishItem } from '../../lib/types';

/** Families trimmed to the members and gifts this user adopted; empty families and members are dropped. */
export function adoptedBy(families: Family[], userId: string | undefined): Family[] {
  if (!userId) return [];
  return families
    .map((family) => ({
      ...family,
      family_members: family.family_members
        .map((member) => ({
          ...member,
          wishlist_items: (member.wishlist_items || []).filter(
            (item) => item.is_adopted && item.adopted_by === userId
          ),
        }))
        .filter((member) => member.wishlist_items.length > 0),
    }))
    .filter((family) => family.family_members.length > 0);
}

export function giftCount(families: Family[]): number {
  return families.reduce(
    (sum, family) =>
      sum + family.family_members.reduce((memberSum, member) => memberSum + (member.wishlist_items?.length || 0), 0),
    0
  );
}

/** "Woman, 34" — who the person is, for gift lists. */
export function memberLine(member: FamilyMember): string {
  const age = member.age === 0 ? 'under 1' : String(member.age);
  return `${roleLabel(member.is_parent, member.sex)}, ${age}`;
}

/** "Clothing · Navy · Size M" */
export function itemMeta(item: WishItem): string {
  return [item.category, item.color, item.size ? `Size ${item.size}` : null].filter(Boolean).join(' · ');
}
