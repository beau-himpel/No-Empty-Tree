export interface Item {
  category: string;
  description: string;
  color?: string;
  size?: string;
  details?: string;
  link?: string;
}

export type Gender = '' | 'Male' | 'Female';

export interface DraftMember {
  id: string;
  name: string;
  age: number | null;
  gender: Gender;
  isChild: boolean | null;
  /** Optional free text; matches the 100-character limit on family_members.ethnicity. */
  ethnicity: string;
  items: Item[];
}

export const MAX_ETHNICITY_LENGTH = 100;

export interface FamilyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export type ResumableStep = 'family' | 'members' | 'review';

export interface NominationDraft {
  family: FamilyDetails;
  members: DraftMember[];
  step: ResumableStep;
}

export const MAX_AGE = 120;

export function emptyDraft(): NominationDraft {
  return {
    family: { name: '', address: '', phone: '', email: '' },
    members: [],
    step: 'family',
  };
}

export function newMember(): DraftMember {
  return {
    id: 'member_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11),
    name: '',
    age: null,
    gender: '',
    isChild: null,
    ethnicity: '',
    items: [],
  };
}

/** Plain-language list of what a member still needs, e.g. ["age", "a wish list item"]. */
export function memberProblems(member: DraftMember): string[] {
  const problems: string[] = [];
  if (!member.name.trim()) problems.push('first name');
  if (member.age === null || member.age < 0 || member.age > MAX_AGE) problems.push('age');
  if (member.isChild === null) problems.push('adult or child');
  if (!member.gender) problems.push('gender');
  if (member.items.length === 0) problems.push('a wish list item');
  return problems;
}

export function isBlankMember(member: DraftMember): boolean {
  return (
    !member.name.trim() &&
    member.age === null &&
    member.isChild === null &&
    !member.gender &&
    !member.ethnicity.trim() &&
    member.items.length === 0
  );
}

/** "first name, age and a wish list item" */
export function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function genderLabel(gender: Gender, isChild: boolean | null): string {
  if (!gender) return '';
  if (isChild === true) return gender === 'Male' ? 'Boy' : 'Girl';
  if (isChild === false) return gender === 'Male' ? 'Man' : 'Woman';
  return gender;
}

/** Links without a scheme would render as relative URLs on this site; assume https. */
export function normalizeLink(link: string | undefined): string | undefined {
  const trimmed = link?.trim();
  if (!trimmed) return undefined;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Reads the current draft format and the earlier `{ familyInfo, formValues }` one. */
export function parseStoredDraft(raw: string | null): NominationDraft | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw);

  if (parsed?.family && Array.isArray(parsed.members)) {
    return {
      ...emptyDraft(),
      ...parsed,
      // Drafts saved before ethnicity was stored don't have the field
      members: parsed.members.map((member: DraftMember) => ({
        ...member,
        ethnicity: member.ethnicity ?? '',
      })),
    };
  }

  if (parsed?.familyInfo) {
    const legacy = parsed.familyInfo;
    const form = parsed.formValues ?? {};
    return {
      family: {
        name: form.name ?? legacy.name ?? '',
        address: form.address ?? legacy.address ?? '',
        phone: form.phone ?? legacy.phone ?? '',
        email: form.email ?? legacy.email ?? '',
      },
      members: (legacy.members ?? []).map((member: any) => ({
        id: member.id || newMember().id,
        name: member.name ?? '',
        age: typeof member.age === 'number' && member.age > 0 ? member.age : null,
        gender: member.gender === 'Male' || member.gender === 'Female' ? member.gender : '',
        isChild: typeof member.isChild === 'boolean' ? member.isChild : null,
        ethnicity: typeof member.ethnicity === 'string' ? member.ethnicity : '',
        items: member.items ?? [],
      })),
      step: 'family',
    };
  }

  return null;
}

export function hasContent(draft: NominationDraft): boolean {
  const { name, address, phone, email } = draft.family;
  return !!(name || address || phone || email) || draft.members.length > 0;
}
