export type PersonTone = 'adult' | 'boy' | 'girl' | 'unknown';

const TONE_CLASSES: Record<PersonTone, string> = {
  adult: 'bg-pine-100 text-pine-800',
  boy: 'bg-sky-100 text-sky-800',
  girl: 'bg-rose-100 text-rose-800',
  unknown: 'bg-stone-100 text-stone-500',
};

/** Text color for the role word ("Girl", "Man") next to a badge of the same tone. */
export const PERSON_TONE_TEXT: Record<PersonTone, string> = {
  adult: 'text-pine-700',
  boy: 'text-sky-700',
  girl: 'text-rose-700',
  unknown: 'text-stone-500',
};

export function personTone(isAdult: boolean | null, sex: string | null | undefined): PersonTone {
  if (isAdult) return 'adult';
  const normalized = sex?.toLowerCase();
  if (normalized === 'male') return 'boy';
  if (normalized === 'female') return 'girl';
  return 'unknown';
}

/** "Girl", "Man"… from how a family member was nominated. */
export function roleLabel(isAdult: boolean, sex: string | null | undefined): string {
  const normalized = sex?.toLowerCase();
  if (isAdult) return normalized === 'male' ? 'Man' : normalized === 'female' ? 'Woman' : 'Adult';
  return normalized === 'male' ? 'Boy' : normalized === 'female' ? 'Girl' : 'Child';
}

/** A person's age, tinted by who they are, so a family reads at a glance. */
export function PersonBadge({
  age,
  tone = 'unknown',
  className = '',
}: {
  age: number | null;
  tone?: PersonTone;
  className?: string;
}) {
  const known = age !== null && age !== undefined;
  const ageText = !known ? '?' : age === 0 ? '<1' : String(age);
  const unit = !known ? '' : age <= 1 ? 'yr' : 'yrs';

  return (
    <span
      className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full ${TONE_CLASSES[tone]} ${className}`}
      aria-hidden="true"
    >
      <span className="text-[1.0625rem] font-semibold leading-none tracking-snug tabular-nums">{ageText}</span>
      {unit && (
        <span className="mt-0.5 text-[0.625rem] font-semibold uppercase leading-none tracking-wide opacity-70">
          {unit}
        </span>
      )}
    </span>
  );
}
