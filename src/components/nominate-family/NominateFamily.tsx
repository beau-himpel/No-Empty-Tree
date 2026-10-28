import { AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { currentUser } from '../../lib/auth';
import { scrollBehavior } from '../../lib/motion';
import { currentSeason, useNominationSettings } from '../../lib/nomination-settings';
import { addFamilyMember, addWishlistItem, createFamily, deleteFamily } from '../../lib/supabase';
import { titleCase } from '../../lib/text';
import { toast } from '../../lib/toast';
import { ExpandCollapse } from '../../shared/animations';
import { confirm } from '../../shared/confirm';
import { formatPhone, isOptionalEmail, isOptionalPhone, notBlank, useAfterRender } from '../../shared/forms';
import { PersonBadge, personTone } from '../../shared/PersonBadge';
import { FieldError } from '../auth/PasswordInput';
import { MemberEditor } from './MemberEditor';
import { NominationDraftContext, useNominationDraftState } from './nomination-draft';
import {
  type DraftMember,
  type FamilyDetails,
  genderLabel,
  isBlankMember,
  type Item,
  joinWithAnd,
  memberProblems,
  normalizeLink,
  type ResumableStep,
} from './nomination.model';

type Step = ResumableStep | 'member' | 'done';
type FamilyField = keyof FamilyDetails;

const STEP_NUMBER: Record<Step, number> = { family: 1, members: 2, member: 2, review: 3, done: 3 };

function memberSummary(member: DraftMember): string {
  const who =
    genderLabel(member.gender, member.isChild) ||
    (member.isChild === true ? 'Child' : member.isChild === false ? 'Adult' : '');
  const parts = [[who, member.age ?? ''].filter((part) => part !== '').join(', ')];
  parts.push(`${member.items.length} ${member.items.length === 1 ? 'gift' : 'gifts'}`);
  return parts.filter(Boolean).join(' · ');
}

function itemVariant(item: Item): string {
  return [item.color, item.size ? `Size ${item.size}` : null].filter(Boolean).join(' · ');
}

const backLinkClass =
  '-ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 active:scale-95';

export default function NominateFamily() {
  const navigate = useNavigate();
  const settings = useNominationSettings();
  const drafts = useNominationDraftState();
  const afterRender = useAfterRender();
  const host = useRef<HTMLElement>(null);

  const settingsLoading = settings.loading || settings.nominationsEnabled === null;

  const [step, setStep] = useState<Step>(drafts.draft.step);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingIsNew, setEditingIsNew] = useState(false);
  const [familySubmitted, setFamilySubmitted] = useState(drafts.draft.step !== 'family');
  const [familyTouched, setFamilyTouched] = useState<ReadonlySet<FamilyField>>(new Set());
  const [membersSubmitted, setMembersSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ familyName: string; gifts: number } | null>(null);

  const family = drafts.draft.family;
  const familyName = titleCase(family.name.trim());

  const familyInvalid: Record<FamilyField, boolean> = {
    name: !notBlank(family.name),
    address: !notBlank(family.address),
    phone: !isOptionalPhone(family.phone),
    email: !isOptionalEmail(family.email),
  };
  const showFamilyError = (field: FamilyField) =>
    familyInvalid[field] && (familyTouched.has(field) || familySubmitted);
  const touchFamily = (field: FamilyField) => () =>
    setFamilyTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  const setFamilyField = (field: FamilyField, value: string) => drafts.updateFamily({ ...family, [field]: value });

  const memberRows = drafts.draft.members.map((member) => ({
    member,
    problems: memberProblems(member),
    summary: memberSummary(member),
    tone: personTone(member.isChild === null ? null : !member.isChild, member.gender),
  }));
  const incompleteCount = memberRows.filter((row) => row.problems.length > 0).length;
  const giftCount = drafts.draft.members.reduce((sum, member) => sum + member.items.length, 0);

  const goTo = (next: Step) => {
    setStep(next);
    if (next === 'family' || next === 'members' || next === 'review') drafts.setStep(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const continueFromFamily = () => {
    setFamilySubmitted(true);
    setFamilyTouched(new Set<FamilyField>(['name', 'address', 'phone', 'email']));
    if (Object.values(familyInvalid).some(Boolean)) {
      afterRender(() => {
        const target = host.current?.querySelector<HTMLElement>('.field-input-invalid');
        target?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
        target?.focus({ preventScroll: true });
      });
      return;
    }
    goTo('members');
  };

  const openEditor = (id: string, isNew: boolean) => {
    setEditingMemberId(id);
    setEditingIsNew(isNew);
    goTo('member');
  };

  const closeEditor = () => {
    const member = editingMemberId ? drafts.member(editingMemberId) : undefined;
    // A member opened via "Add" and left untouched shouldn't linger as a blank row
    if (editingMemberId && member && isBlankMember(member)) {
      drafts.removeMember(editingMemberId, { undoable: false });
    }
    setEditingMemberId(null);
    goTo('members');
  };

  const removeEditingMember = () => {
    if (!editingMemberId) return;
    const member = drafts.member(editingMemberId);
    drafts.removeMember(editingMemberId, { undoable: !!member && !isBlankMember(member) });
    setEditingMemberId(null);
    goTo('members');
  };

  const continueFromMembers = () => {
    setMembersSubmitted(true);
    if (memberRows.length === 0 || incompleteCount > 0) return;
    goTo('review');
  };

  const resetFlow = () => {
    // A pending "Undo" would otherwise write into the fresh, empty draft
    toast.clear();
    drafts.reset();
    setFamilyTouched(new Set());
    setFamilySubmitted(false);
    setMembersSubmitted(false);
    setSaveError(null);
  };

  const startOver = async () => {
    const confirmed = await confirm({
      tone: 'dark',
      icon: 'pi-refresh',
      title: 'Start over?',
      message: "This clears the family details and members you've entered so far.",
      confirmLabel: 'Start over',
    });
    if (!confirmed) return;
    resetFlow();
    goTo('family');
  };

  const viewOnAdoptFamilies = () => navigate('/adopt-family', { viewTransition: true });

  const submit = async () => {
    if (isSaving) return;

    const user = currentUser();
    if (!user) {
      setSaveError('Your session has ended. Please sign in again to submit.');
      return;
    }

    const draft = drafts.draft;
    if (Object.values(familyInvalid).some(Boolean) || draft.members.length === 0 || incompleteCount > 0) {
      setSaveError('Some details are missing. Check the family and members above.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const familyRecord = await createFamily({
        last_name: draft.family.name.trim(),
        address: draft.family.address.trim(),
        phone: draft.family.phone || undefined,
        email: draft.family.email.trim() || undefined,
        nominated_by: user.id,
        season: await currentSeason(),
      });

      try {
        for (const member of draft.members) {
          const memberRecord = await addFamilyMember({
            family_id: familyRecord.id,
            first_name: member.name.trim(),
            age: member.age ?? 0,
            sex: member.gender === 'Female' ? 'female' : 'male',
            is_parent: member.isChild === false,
            // Omitted when blank, so saving works even before the column migration runs
            ethnicity: member.ethnicity.trim() || undefined,
          });

          for (const item of member.items) {
            await addWishlistItem({
              family_member_id: memberRecord.id,
              category: item.category,
              description: item.description,
              color: item.color || undefined,
              size: item.size || undefined,
              link: normalizeLink(item.link),
              details: item.details || undefined,
            });
          }
        }
      } catch (memberError) {
        // Don't leave a half-saved family on the adopt list
        await deleteFamily(familyRecord.id).catch(() => undefined);
        throw memberError;
      }

      setSubmitted({ familyName, gifts: giftCount });
      resetFlow();
      setStep('done');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
      console.error('Error saving nomination:', error);
      setSaveError("We couldn't submit this nomination. Your draft is saved, so please try again.");
      toast.error("Couldn't submit the nomination");
    } finally {
      setIsSaving(false);
    }
  };

  const stepNumber = STEP_NUMBER[step];

  let content;
  if (settingsLoading) {
    content = (
      <>
        <div className="animate-pulse" aria-hidden="true">
          <div className="h-10 w-3/4 rounded-lg bg-stone-200" />
          <div className="mt-4 h-4 w-full rounded bg-stone-100" />
          <div className="mt-10 space-y-6">
            {[1, 2, 3].map((placeholder) => (
              <div key={placeholder}>
                <div className="h-4 w-24 rounded bg-stone-100" />
                <div className="mt-2 h-12 w-full rounded-xl bg-stone-100" />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only" role="status">
          Loading…
        </span>
      </>
    );
  } else if (!settings.nominationsEnabled) {
    content = (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center animate-fade-up">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
          <i className="pi pi-lock text-xl text-stone-500" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-title text-stone-900">Nominations are closed</h1>
          <p className="mt-1 text-[0.9375rem] text-stone-500">
            We aren't accepting new family nominations right now. You can still adopt gifts for families already on
            the list.
          </p>
        </div>
        <button type="button" className="btn-adopt" onClick={viewOnAdoptFamilies}>
          Browse families
        </button>
      </div>
    );
  } else {
    content = (
      <>
        {step !== 'done' && (
          <div className="mb-8" aria-hidden="true">
            <p className="type-section-label tabular-nums">Step {stepNumber} of 3</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map((segment) => (
                <div key={segment} className="h-1 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-pine-600 transition-[width] duration-500 ease-out"
                    style={{ width: segment <= stepNumber ? '100%' : '0%' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {drafts.restored && step !== 'done' && (
          <div className="mb-8 flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-4 py-3 animate-fade-in">
            <span className="flex items-center gap-2 text-sm text-stone-600">
              <i className="pi pi-history text-xs" aria-hidden="true" />
              Picking up where you left off
            </span>
            <button
              type="button"
              className="shrink-0 rounded-full px-2 py-1 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-100"
              onClick={startOver}
            >
              Start over
            </button>
          </div>
        )}

        {step === 'family' && (
          <div className="animate-fade-up">
            <h1 className="type-page-title">Nominate a family</h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-stone-500">
              Tell us about a family who could use some help this season. Their address and contact details aren't
              shown on the adoption pages.
            </p>

            <div className="mt-10 space-y-6">
              <div>
                <label className="field-label" htmlFor="family-name">
                  Family last name
                </label>
                <input
                  className={`field-input ${showFamilyError('name') ? 'field-input-invalid' : ''}`}
                  id="family-name"
                  placeholder="e.g. Hernandez"
                  autoComplete="off"
                  autoCapitalize="words"
                  aria-invalid={showFamilyError('name') || undefined}
                  value={family.name}
                  onChange={(event) => setFamilyField('name', event.target.value)}
                  onBlur={touchFamily('name')}
                />
                {showFamilyError('name') && <FieldError>Enter the family's last name</FieldError>}
              </div>

              <div>
                <label className="field-label" htmlFor="family-address">
                  Address
                </label>
                <input
                  className={`field-input ${showFamilyError('address') ? 'field-input-invalid' : ''}`}
                  id="family-address"
                  placeholder="Street, city, state, ZIP"
                  autoComplete="off"
                  aria-invalid={showFamilyError('address') || undefined}
                  value={family.address}
                  onChange={(event) => setFamilyField('address', event.target.value)}
                  onBlur={touchFamily('address')}
                />
                {showFamilyError('address') && <FieldError>Enter the family's address</FieldError>}
              </div>

              <div>
                <label className="field-label" htmlFor="family-phone">
                  Phone <span className="field-optional">optional</span>
                </label>
                <input
                  className={`field-input tabular-nums ${showFamilyError('phone') ? 'field-input-invalid' : ''}`}
                  id="family-phone"
                  type="tel"
                  inputMode="tel"
                  maxLength={14}
                  placeholder="(555) 123-4567"
                  autoComplete="off"
                  aria-invalid={showFamilyError('phone') || undefined}
                  value={family.phone}
                  // Formatting happens on input rather than filtering keydown: Android soft
                  // keyboards report most keys as "Unidentified", so key filtering blocks typing.
                  onChange={(event) => setFamilyField('phone', formatPhone(event.target.value))}
                  onPaste={(event) => {
                    event.preventDefault();
                    setFamilyField('phone', formatPhone(family.phone + event.clipboardData.getData('text')));
                  }}
                  onBlur={touchFamily('phone')}
                />
                {showFamilyError('phone') && <FieldError>Enter a 10-digit phone number</FieldError>}
              </div>

              <div>
                <label className="field-label" htmlFor="family-email">
                  Email <span className="field-optional">optional</span>
                </label>
                <input
                  className={`field-input ${showFamilyError('email') ? 'field-input-invalid' : ''}`}
                  id="family-email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={showFamilyError('email') || undefined}
                  value={family.email}
                  onChange={(event) => setFamilyField('email', event.target.value)}
                  onBlur={touchFamily('email')}
                />
                {showFamilyError('email') && <FieldError>Enter a valid email address</FieldError>}
              </div>
            </div>

            <button type="button" className="btn-adopt btn-lg mt-10 w-full sm:w-auto" onClick={continueFromFamily}>
              Continue
              <i className="pi pi-arrow-right text-sm" aria-hidden="true" />
            </button>
          </div>
        )}

        {step === 'members' && (
          <div className="animate-fade-up">
            <button type="button" className={backLinkClass} onClick={() => goTo('family')}>
              <i className="pi pi-chevron-left text-xs" aria-hidden="true" />
              Family details
            </button>
            <h1 className="type-page-title mt-3">Who's in the {familyName || 'family'} family?</h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-stone-500">
              Add everyone in the household. Each person needs at least one gift on their wish list.
            </p>

            <div className="mt-10 divide-y divide-stone-100 border-y border-stone-100">
              <AnimatePresence initial={false}>
                {memberRows.map((row) => (
                  <ExpandCollapse key={row.member.id}>
                    <button
                      type="button"
                      className="group flex w-full items-center gap-3 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pine-600"
                      onClick={() => openEditor(row.member.id, false)}
                    >
                      <PersonBadge
                        className="transition-transform duration-150 group-active:scale-95"
                        age={row.member.age}
                        tone={row.tone}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold tracking-snug text-stone-900">
                          {titleCase(row.member.name.trim()) || 'Unnamed member'}
                        </span>
                        {row.problems.length > 0 ? (
                          <span className={`block text-sm ${membersSubmitted ? 'text-berry-700' : 'text-stone-500'}`}>
                            Needs {joinWithAnd(row.problems)}
                          </span>
                        ) : (
                          <span className="block text-sm text-stone-500">{row.summary}</span>
                        )}
                      </span>
                      {row.problems.length > 0 && membersSubmitted && (
                        <i className="pi pi-exclamation-circle shrink-0 text-berry-600" aria-hidden="true" />
                      )}
                      <i className="pi pi-chevron-right shrink-0 text-sm text-stone-400" aria-hidden="true" />
                    </button>
                  </ExpandCollapse>
                ))}
              </AnimatePresence>

              <button
                type="button"
                className="flex w-full items-center gap-3 py-4 text-left text-base font-semibold text-pine-700 transition-colors hover:text-pine-800"
                onClick={() => openEditor(drafts.addMember().id, true)}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pine-50" aria-hidden="true">
                  <i className="pi pi-plus text-sm" />
                </span>
                Add {memberRows.length > 0 ? 'another' : 'a'} family member
              </button>
            </div>

            {membersSubmitted && memberRows.length === 0 ? (
              <FieldError>Add at least one family member</FieldError>
            ) : membersSubmitted && incompleteCount > 0 ? (
              <FieldError>
                Finish{' '}
                {incompleteCount === 1 ? 'the highlighted member' : `the ${incompleteCount} highlighted members`} to
                continue
              </FieldError>
            ) : null}

            <button type="button" className="btn-adopt btn-lg mt-10 w-full sm:w-auto" onClick={continueFromMembers}>
              Review nomination
              <i className="pi pi-arrow-right text-sm" aria-hidden="true" />
            </button>
          </div>
        )}

        {step === 'member' && editingMemberId && (
          <MemberEditor
            key={editingMemberId}
            memberId={editingMemberId}
            isNew={editingIsNew}
            onSaved={closeEditor}
            onBack={closeEditor}
            onRemoveRequested={removeEditingMember}
          />
        )}

        {step === 'review' && (
          <div className="animate-fade-up">
            <button type="button" className={backLinkClass} onClick={() => goTo('members')}>
              <i className="pi pi-chevron-left text-xs" aria-hidden="true" />
              Family members
            </button>
            <h1 className="type-page-title mt-3">Review and submit</h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-stone-500">
              Once submitted, the family appears on Adopt Families right away.
            </p>

            <section className="mt-10">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-2">
                <h2 className="type-section-label">Family</h2>
                <button
                  type="button"
                  className="text-sm font-semibold text-pine-700 hover:text-pine-800"
                  onClick={() => goTo('family')}
                >
                  Edit
                </button>
              </div>
              <dl className="divide-y divide-stone-100 text-[0.9375rem]">
                <div className="flex justify-between gap-6 py-3">
                  <dt className="text-stone-500">Last name</dt>
                  <dd className="text-right font-medium text-stone-900">{familyName}</dd>
                </div>
                <div className="flex justify-between gap-6 py-3">
                  <dt className="shrink-0 text-stone-500">Address</dt>
                  <dd className="text-right font-medium text-stone-900">{family.address}</dd>
                </div>
                {family.phone && (
                  <div className="flex justify-between gap-6 py-3">
                    <dt className="text-stone-500">Phone</dt>
                    <dd className="text-right font-medium tabular-nums text-stone-900">{family.phone}</dd>
                  </div>
                )}
                {family.email && (
                  <div className="flex justify-between gap-6 py-3">
                    <dt className="text-stone-500">Email</dt>
                    <dd className="min-w-0 truncate text-right font-medium text-stone-900">{family.email}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="mt-10">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-2">
                <h2 className="type-section-label tabular-nums">
                  {memberRows.length} {memberRows.length === 1 ? 'person' : 'people'} · {giftCount}{' '}
                  {giftCount === 1 ? 'gift' : 'gifts'}
                </h2>
                <button
                  type="button"
                  className="text-sm font-semibold text-pine-700 hover:text-pine-800"
                  onClick={() => goTo('members')}
                >
                  Edit
                </button>
              </div>
              <div className="divide-y divide-stone-100">
                {memberRows.map((row) => (
                  <div key={row.member.id} className="py-4">
                    <p className="font-semibold tracking-snug text-stone-900">{titleCase(row.member.name.trim())}</p>
                    <p className="text-sm text-stone-500">{row.summary}</p>
                    {row.member.ethnicity.trim() && (
                      <p className="text-sm text-stone-500">Ethnicity: {row.member.ethnicity.trim()}</p>
                    )}
                    <ul className="mt-2 space-y-1">
                      {row.member.items.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-stone-700">
                          <span className="text-stone-300" aria-hidden="true">
                            •
                          </span>
                          <span>
                            {item.description}
                            {(item.size || item.color) && (
                              <span className="text-stone-400"> · {itemVariant(item)}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {saveError && (
              <div className="mt-8 flex items-start gap-3 rounded-2xl bg-berry-50 p-4 animate-fade-up" role="alert">
                <i className="pi pi-exclamation-circle mt-0.5 text-berry-600" aria-hidden="true" />
                <span className="text-sm font-medium text-berry-800">{saveError}</span>
              </div>
            )}

            <button type="button" className="btn-primary btn-lg mt-10 w-full" disabled={isSaving} onClick={submit}>
              {isSaving ? (
                <>
                  <i className="pi pi-spin pi-spinner" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                'Submit nomination'
              )}
            </button>
            <p className="mt-3 text-center text-[0.8125rem] text-stone-400">
              Adopters see first names, ages and wish lists, not the address or contact details.
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center py-10 text-center animate-fade-up">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full bg-pine-700 text-white animate-pop"
              aria-hidden="true"
            >
              <i className="pi pi-check text-2xl" />
            </span>
            <h1 className="type-page-title mt-6">Nomination received</h1>
            <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-stone-500" role="status">
              The {submitted?.familyName} family and their {submitted?.gifts}{' '}
              {submitted?.gifts === 1 ? 'gift is' : 'gifts are'} now on Adopt Families. Thank you for looking out for
              them.
            </p>
            <div className="mt-10 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button type="button" className="btn-primary btn-lg" onClick={viewOnAdoptFamilies}>
                See it on Adopt Families
              </button>
              <button
                type="button"
                className="btn-quiet btn-lg"
                onClick={() => {
                  setSubmitted(null);
                  goTo('family');
                }}
              >
                Nominate another family
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <NominationDraftContext.Provider value={drafts}>
      <section ref={host} className="mx-auto w-full max-w-xl">
        {content}
      </section>
    </NominationDraftContext.Provider>
  );
}
