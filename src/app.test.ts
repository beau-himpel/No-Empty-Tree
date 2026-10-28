import { describe, expect, it } from 'vitest';
import {
  joinWithAnd,
  memberProblems,
  newMember,
  normalizeLink,
  parseStoredDraft,
} from './components/nominate-family/nomination.model';
import { authErrorKind, authErrorMessage } from './lib/auth-errors';
import { titleCase } from './lib/text';
import { formatPhone, isOptionalEmail, isOptionalPhone } from './shared/forms';

describe('auth error mapping', () => {
  it('recognizes errors by code and by message', () => {
    expect(authErrorKind({ code: 'invalid_credentials' })).toBe('invalid_credentials');
    expect(authErrorKind({ message: 'Email not confirmed' })).toBe('email_not_confirmed');
    expect(authErrorKind({ code: 'over_email_send_rate_limit' })).toBe('rate_limited');
    expect(authErrorKind({ name: 'AuthRetryableFetchError' })).toBe('network');
    expect(authErrorKind(undefined)).toBe('unknown');
  });

  it('never surfaces raw server text', () => {
    expect(authErrorMessage({ message: 'some internal stack trace' })).toBe('Something went wrong. Please try again.');
  });
});

describe('nomination model', () => {
  it('lists what a member still needs, in plain language', () => {
    const member = { ...newMember(), name: 'Ana' };
    expect(joinWithAnd(memberProblems(member))).toBe('age, adult or child, gender and a wish list item');
  });

  it('accepts age 0 for babies', () => {
    const baby = {
      ...newMember(),
      name: 'Ana',
      age: 0,
      isChild: true,
      gender: 'Female' as const,
      items: [{ category: 'Toy', description: 'Blocks' }],
    };
    expect(memberProblems(baby)).toEqual([]);
  });

  it('prefixes scheme-less links with https', () => {
    expect(normalizeLink('amazon.com/x')).toBe('https://amazon.com/x');
    expect(normalizeLink('http://example.com')).toBe('http://example.com');
    expect(normalizeLink('  ')).toBeUndefined();
  });

  it('migrates drafts from the original wizard format', () => {
    const draft = parseStoredDraft(
      JSON.stringify({
        familyInfo: { members: [{ name: 'Mia', age: 6, gender: 'Female', ethnicity: 'Mexican American', isChild: true, items: [] }] },
        formValues: { name: 'Lopez', address: '5 Pine Rd' },
      })
    );
    expect(draft?.family.name).toBe('Lopez');
    expect(draft?.members[0].ethnicity).toBe('Mexican American');
    expect(draft?.members[0].age).toBe(6);
  });
});

describe('form helpers', () => {
  it('formats US phone numbers as they are typed', () => {
    expect(formatPhone('555')).toBe('(555');
    expect(formatPhone('5551234')).toBe('(555) 123-4');
    expect(formatPhone('+1 (555) 123-45678')).toBe('(155) 512-3456');
    expect(isOptionalPhone('')).toBe(true);
    expect(isOptionalPhone('(555) 123-4567')).toBe(true);
    expect(isOptionalPhone('(555) 123')).toBe(false);
  });

  it('treats a blank optional email as valid', () => {
    expect(isOptionalEmail('')).toBe(true);
    expect(isOptionalEmail('ana@example.com')).toBe(true);
    expect(isOptionalEmail('ana@')).toBe(false);
  });

  it('title-cases names like the Angular pipe did', () => {
    expect(titleCase("o'BRIEN-smith family")).toBe("O'Brien-Smith Family");
    expect(titleCase('josé')).toBe('José');
  });
});
