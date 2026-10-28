import type { ReactNode } from 'react';

/** A password field with a show/hide toggle. */
export function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  autoComplete,
  invalid,
  describedBy,
  showPassword,
  onToggleShow,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  autoComplete: string;
  invalid: boolean;
  describedBy?: string;
  showPassword: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="relative">
      <input
        className={`field-input pr-12 ${invalid ? 'field-input-invalid' : ''}`}
        id={id}
        type={showPassword ? 'text' : 'password'}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <button
        type="button"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2.5 text-stone-400 transition-colors hover:text-stone-700"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        aria-pressed={showPassword}
        onClick={onToggleShow}
      >
        <i className={`pi text-base ${showPassword ? 'pi-eye-slash' : 'pi-eye'}`} aria-hidden="true" />
      </button>
    </div>
  );
}

export function FieldError({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p className="field-error" id={id}>
      <i className="pi pi-exclamation-circle text-xs" aria-hidden="true" />
      {children}
    </p>
  );
}
