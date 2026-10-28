import { useId, useImperativeHandle, useState, type Ref } from 'react';
import { ChoiceGroup, type ChoiceOption } from '../../shared/ChoiceGroup';
import { notBlank } from '../../shared/forms';
import { FieldError } from '../auth/PasswordInput';
import { type Item, normalizeLink } from './nomination.model';

const CATEGORY_OPTIONS: ChoiceOption<string>[] = ['Toy', 'Clothing', 'Book', 'Electronics', 'Other'].map(
  (value) => ({ label: value, value })
);

const EMPTY_FORM = { category: '', description: '', color: '', size: '', link: '', details: '' };

export interface ItemFormHandle {
  /**
   * Adds the gift if it is complete. A partially filled gift is never dropped:
   * it reports 'invalid' and shows what's missing so the caller can stay put.
   */
  commit(): 'empty' | 'added' | 'invalid';
}

export function ItemForm({
  ref,
  canCancel = true,
  onAdded,
  onCancelled,
}: {
  ref?: Ref<ItemFormHandle>;
  canCancel?: boolean;
  onAdded: (item: Item) => void;
  onCancelled: () => void;
}) {
  const uid = `gift-${useId()}`;
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState<ReadonlySet<'category' | 'description'>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const invalid = { category: form.category === '', description: !notBlank(form.description) };
  const showError = (name: 'category' | 'description') => invalid[name] && (touched.has(name) || submitted);
  const touch = (name: 'category' | 'description') => () =>
    setTouched((current) => (current.has(name) ? current : new Set(current).add(name)));
  const set = (name: keyof typeof EMPTY_FORM) => (value: string) => setForm((current) => ({ ...current, [name]: value }));

  const hasInput = () => Object.values(form).some((value) => value.trim() !== '');

  const reset = () => {
    setForm(EMPTY_FORM);
    setTouched(new Set());
    setSubmitted(false);
  };

  const commit = (): 'empty' | 'added' | 'invalid' => {
    if (!hasInput()) return 'empty';
    if (invalid.category || invalid.description) {
      setSubmitted(true);
      return 'invalid';
    }

    onAdded({
      category: form.category,
      description: form.description.trim(),
      color: form.color.trim() || undefined,
      size: form.size.trim() || undefined,
      link: normalizeLink(form.link),
      details: form.details.trim() || undefined,
    });
    reset();
    return 'added';
  };

  useImperativeHandle(ref, () => ({ commit }));

  const submit = () => {
    if (!hasInput()) {
      setSubmitted(true);
      return;
    }
    commit();
  };

  const cancel = () => {
    reset();
    onCancelled();
  };

  return (
    <div className="space-y-5">
      <div>
        <span className="field-label" id={`${uid}-category`}>
          Category
        </span>
        <ChoiceGroup
          variant="chips"
          options={CATEGORY_OPTIONS}
          value={form.category || null}
          onChange={set('category')}
          onBlur={touch('category')}
          labelledBy={`${uid}-category`}
          invalid={showError('category')}
        />
        {showError('category') && <FieldError>Choose a category</FieldError>}
      </div>

      <div>
        <label className="field-label" htmlFor={`${uid}-description`}>
          What's the gift?
        </label>
        <input
          className={`field-input ${showError('description') ? 'field-input-invalid' : ''}`}
          id={`${uid}-description`}
          placeholder="e.g. Warm winter coat"
          autoComplete="off"
          value={form.description}
          onChange={(event) => set('description')(event.target.value)}
          onBlur={touch('description')}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
        />
        {showError('description') && <FieldError>Describe the gift</FieldError>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor={`${uid}-size`}>
            Size <span className="field-optional">optional</span>
          </label>
          <input
            className="field-input"
            id={`${uid}-size`}
            placeholder="e.g. Youth M"
            autoComplete="off"
            value={form.size}
            onChange={(event) => set('size')(event.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${uid}-color`}>
            Color <span className="field-optional">optional</span>
          </label>
          <input
            className="field-input"
            id={`${uid}-color`}
            placeholder="e.g. Navy"
            autoComplete="off"
            value={form.color}
            onChange={(event) => set('color')(event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor={`${uid}-link`}>
          Product link <span className="field-optional">optional</span>
        </label>
        <input
          className="field-input"
          id={`${uid}-link`}
          inputMode="url"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste a link to the exact item"
          value={form.link}
          onChange={(event) => set('link')(event.target.value)}
        />
      </div>

      <div>
        <label className="field-label" htmlFor={`${uid}-details`}>
          Notes for the adopter <span className="field-optional">optional</span>
        </label>
        <textarea
          className="field-input min-h-[5.5rem] resize-y"
          id={`${uid}-details`}
          rows={3}
          placeholder="Favorite colors, brands, anything that helps"
          value={form.details}
          onChange={(event) => set('details')(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn-dark w-full sm:w-auto" onClick={submit}>
          <i className="pi pi-plus text-xs" aria-hidden="true" />
          Add to wish list
        </button>
        {canCancel && (
          <button type="button" className="btn-quiet w-full sm:w-auto" onClick={cancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
