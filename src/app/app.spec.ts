import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { authErrorKind, authErrorMessage } from './auth.service';
import { joinWithAnd, memberProblems, newMember, normalizeLink, parseStoredDraft } from './components/nominate-family/nomination.model';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app shell with a router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).not.toBeNull();
  });
});

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
    const baby = { ...newMember(), name: 'Ana', age: 0, isChild: true, gender: 'Female' as const, items: [{ category: 'Toy', description: 'Blocks' }] };
    expect(memberProblems(baby)).toEqual([]);
  });

  it('prefixes scheme-less links with https', () => {
    expect(normalizeLink('amazon.com/x')).toBe('https://amazon.com/x');
    expect(normalizeLink('http://example.com')).toBe('http://example.com');
    expect(normalizeLink('  ')).toBeUndefined();
  });

  it('migrates drafts from the original wizard format', () => {
    const draft = parseStoredDraft(JSON.stringify({
      familyInfo: { members: [{ name: 'Mia', age: 6, gender: 'Female', ethnicity: 'Mexican American', isChild: true, items: [] }] },
      formValues: { name: 'Lopez', address: '5 Pine Rd' },
    }));
    expect(draft?.family.name).toBe('Lopez');
    expect(draft?.members[0].ethnicity).toBe('Mexican American');
    expect(draft?.members[0].age).toBe(6);
  });
});
