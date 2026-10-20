import { Family } from '../../shared/types';

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
      sum +
      family.family_members.reduce(
        (memberSum, member) => memberSum + (member.wishlist_items?.length || 0),
        0
      ),
    0
  );
}
