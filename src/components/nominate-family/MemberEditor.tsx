import { AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { scrollBehavior } from '../../lib/motion';
import { titleCase } from '../../lib/text';
import { ExpandCollapse } from '../../shared/animations';
import { ChoiceGroup, type ChoiceOption } from '../../shared/ChoiceGroup';
import { notBlank, useAfterRender } from '../../shared/forms';
import { FieldError } from '../auth/PasswordInput';
import { ItemInfo } from '../item-info/ItemInfo';
import { ItemForm, type ItemFormHandle } from './ItemForm';
import { useNominationDraft } from './nomination-draft';
import { type Gender, type Item, MAX_AGE, MAX_ETHNICITY_LENGTH, memberProblems } from './nomination.model';

const ADULT_AGE = 18;

const TYPE_OPTIONS: ChoiceOption<boolean>[] = [
  { label: 'Adult', value: false },
  { label: 'Child', value: true },
];

type Field = 'name' | 'age' | 'isChild' | 'gender';

// Draft items have no ids; key each by identity so add, remove and undo animate the right row
const itemKeys = new WeakMap<Item, number>();
let nextItemKey = 0;
function itemKey(item: Item): number {
  let key = itemKeys.get(item);
  if (key === undefined) {
    key = nextItemKey++;
    itemKeys.set(item, key);
  }
  return key;
}

export function MemberEditor({
  memberId,
  isNew,
  onSaved,
  onBack,
  onRemoveRequested,
}: {
  memberId: string;
  isNew: boolean;
  onSaved: () => void;
  onBack: () => void;
  onRemoveRequested: () => void;
}) {
  const drafts = useNominationDraft();
  const afterRender = useAfterRender();
  const host = useRef<HTMLDivElement>(null);
  const giftForm = useRef<ItemFormHandle>(null);
  const giftSection = useRef<HTMLElement>(null);

  const member = drafts.draft.members.find((candidate) => candidate.id === memberId);
  const items = member?.items ?? [];

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<Field>>(new Set());
  const [showGiftForm, setShowGiftForm] = useState(() => (member?.items.length ?? 0) === 0);
  // Adult/child is suggested from the age until the user picks it themselves
  const typeChosenByUser = useRef(member?.isChild !== null && member?.isChild !== undefined);

  if (!member) return null;

  const name = member.name.trim();
  const title = name ? titleCase(name) : isNew ? 'Add a family member' : 'Family member';
  const { isChild } = member;
  const genderOptions: ChoiceOption<Gender>[] = [
    { label: isChild === true ? 'Boy' : isChild === false ? 'Man' : 'Male', value: 'Male' },
    { label: isChild === true ? 'Girl' : isChild === false ? 'Woman' : 'Female', value: 'Female' },
  ];

  const invalid: Record<Field, boolean> = {
    name: !notBlank(member.name),
    age: member.age === null || member.age < 0 || member.age > MAX_AGE || !Number.isInteger(member.age),
    isChild: member.isChild === null,
    gender: !member.gender,
  };
  const showError = (field: Field) => invalid[field] && (touched.has(field) || submitted);
  const touch = (field: Field) => () =>
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  const giftsMissing = submitted && items.length === 0;

  const update = (changes: Parameters<typeof drafts.updateMember>[1]) => drafts.updateMember(memberId, changes);

  const setAge = (raw: string) => {
    const age = raw === '' ? null : Number(raw);
    if (!typeChosenByUser.current && age !== null && age >= 0 && age <= MAX_AGE) {
      update({ age, isChild: age < ADULT_AGE });
    } else {
      update({ age });
    }
  };

  const setIsChild = (value: boolean) => {
    typeChosenByUser.current = true;
    update({ isChild: value });
  };

  const addItem = (item: Item) => {
    drafts.addItem(memberId, item);
    setShowGiftForm(false);
  };

  const openGiftForm = () => {
    setShowGiftForm(true);
    afterRender(() => host.current?.querySelector<HTMLElement>('.item-form [role="radio"]')?.focus());
  };

  /** Adds a finished gift that hasn't been added yet; blocks on a half-filled one. */
  const settleGiftForm = (): boolean => {
    if (giftForm.current?.commit() === 'invalid') {
      giftSection.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
      return false;
    }
    return true;
  };

  const save = () => {
    if (!settleGiftForm()) return;

    setSubmitted(true);
    setTouched(new Set<Field>(['name', 'age', 'isChild', 'gender']));
    // A gift the form just committed isn't in this render's member yet
    const current = drafts.member(memberId);
    if (!current) return;

    if (memberProblems(current).length > 0) {
      afterRender(() => {
        const target = host.current?.querySelector<HTMLElement>(
          '.field-input-invalid, [role="radiogroup"][aria-invalid="true"] [role="radio"], #gifts-missing'
        );
        target?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
        if (target && target.id !== 'gifts-missing') target.focus({ preventScroll: true });
      });
      return;
    }
    onSaved();
  };

  const goBack = () => {
    if (settleGiftForm()) onBack();
  };

  return (
    <div ref={host} className="animate-fade-up">
      <button
        type="button"
        className="-ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 active:scale-95"
        onClick={goBack}
      >
        <i className="pi pi-chevron-left text-xs" aria-hidden="true" />
        Family members
      </button>

      <h1 className="type-page-title mt-3 truncate">{title}</h1>

      <div className="mt-8 space-y-6">
        <div>
          <label className="field-label" htmlFor="member-name">
            First name
          </label>
          <input
            className={`field-input ${showError('name') ? 'field-input-invalid' : ''}`}
            id="member-name"
            autoComplete="off"
            autoCapitalize="words"
            aria-invalid={showError('name') || undefined}
            value={member.name}
            onChange={(event) => update({ name: event.target.value })}
            onBlur={touch('name')}
          />
          {showError('name') && <FieldError>Enter a first name</FieldError>}
        </div>

        <div>
          <label className="field-label" htmlFor="member-age">
            Age
          </label>
          <input
            className={`field-input max-w-[8rem] tabular-nums ${showError('age') ? 'field-input-invalid' : ''}`}
            id="member-age"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_AGE}
            aria-invalid={showError('age') || undefined}
            aria-describedby="member-age-hint"
            value={member.age ?? ''}
            onChange={(event) => setAge(event.target.value)}
            onBlur={touch('age')}
          />
          {showError('age') ? (
            <FieldError>Enter an age from 0 to 120</FieldError>
          ) : (
            <p className="field-hint" id="member-age-hint">
              Use 0 for babies under one.
            </p>
          )}
        </div>

        <div>
          <span className="field-label" id="member-type-label">
            Adult or child
          </span>
          <ChoiceGroup
            options={TYPE_OPTIONS}
            value={member.isChild}
            onChange={setIsChild}
            onBlur={touch('isChild')}
            labelledBy="member-type-label"
            invalid={showError('isChild')}
          />
          {showError('isChild') && <FieldError>Choose adult or child</FieldError>}
        </div>

        <div>
          <span className="field-label" id="member-gender-label">
            Gender
          </span>
          <ChoiceGroup
            options={genderOptions}
            value={member.gender || null}
            onChange={(gender) => update({ gender })}
            onBlur={touch('gender')}
            labelledBy="member-gender-label"
            invalid={showError('gender')}
          />
          {showError('gender') && <FieldError>Choose a gender</FieldError>}
        </div>

        <div>
          <label className="field-label" htmlFor="member-ethnicity">
            Ethnicity <span className="field-optional">optional</span>
          </label>
          <input
            className="field-input"
            id="member-ethnicity"
            autoComplete="off"
            autoCapitalize="words"
            maxLength={MAX_ETHNICITY_LENGTH}
            aria-describedby="member-ethnicity-hint"
            value={member.ethnicity}
            onChange={(event) => update({ ethnicity: event.target.value })}
          />
          <p className="field-hint" id="member-ethnicity-hint">
            Not shown to adopters.
          </p>
        </div>
      </div>

      <section className="mt-12 scroll-mt-20" ref={giftSection}>
        <div className="flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="type-section-label">Wish list</h2>
          {items.length > 0 && (
            <span className="text-[0.8125rem] font-medium tabular-nums text-stone-500">
              {items.length} {items.length === 1 ? 'gift' : 'gifts'}
            </span>
          )}
        </div>

        <div className="divide-y divide-stone-100">
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <ExpandCollapse key={itemKey(item)}>
                <div className="flex items-start gap-3 py-4">
                  <ItemInfo item={item} />
                  <button
                    type="button"
                    className="btn-quiet -mr-2 -mt-1 !p-2.5"
                    onClick={() => drafts.removeItem(memberId, i)}
                    aria-label={`Remove ${item.description}`}
                  >
                    <i className="pi pi-times text-sm" aria-hidden="true" />
                  </button>
                </div>
              </ExpandCollapse>
            ))}
          </AnimatePresence>
        </div>

        {giftsMissing && <FieldError id="gifts-missing">Add at least one gift</FieldError>}

        <AnimatePresence initial={false}>
          {showGiftForm ? (
            <ExpandCollapse key="form">
              <div className="item-form pt-5">
                {items.length === 0 && (
                  <p className="mb-5 text-[0.9375rem] text-stone-500">
                    What would {name ? title : 'they'} love to unwrap? Be as specific as you can.
                  </p>
                )}
                <ItemForm
                  ref={giftForm}
                  canCancel={items.length > 0}
                  onAdded={addItem}
                  onCancelled={() => setShowGiftForm(false)}
                />
              </div>
            </ExpandCollapse>
          ) : (
            <button
              key="add"
              type="button"
              className="mt-4 flex w-full items-center gap-3 rounded-xl py-3 text-left text-[0.9375rem] font-semibold text-pine-700 transition-colors hover:text-pine-800 active:scale-[0.99]"
              onClick={openGiftForm}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pine-50" aria-hidden="true">
                <i className="pi pi-plus text-xs" />
              </span>
              Add {items.length > 0 ? 'another' : 'a'} gift
            </button>
          )}
        </AnimatePresence>
      </section>

      <div className="mt-12 flex flex-col gap-2 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="btn-dark btn-lg w-full sm:w-auto" onClick={save}>
          {isNew ? 'Add to family' : 'Save'}
        </button>
        <button
          type="button"
          className="btn-quiet btn-lg w-full !text-berry-700 hover:!bg-berry-50 sm:w-auto"
          onClick={onRemoveRequested}
        >
          Remove from family
        </button>
      </div>
    </div>
  );
}
