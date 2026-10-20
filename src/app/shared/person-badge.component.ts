import { Component, computed, input } from '@angular/core';

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
@Component({
  selector: 'app-person-badge',
  standalone: true,
  template: `
    <span class="text-[1.0625rem] font-semibold leading-none tracking-snug tabular-nums">{{ ageText() }}</span>
    @if (unit()) {
    <span class="mt-0.5 text-[0.625rem] font-semibold uppercase leading-none tracking-wide opacity-70">{{ unit() }}</span>
    }
  `,
  host: {
    class: 'flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full',
    '[class]': 'toneClass()',
    'aria-hidden': 'true',
  },
})
export class PersonBadgeComponent {
  readonly age = input<number | null>(null);
  readonly tone = input<PersonTone>('unknown');

  readonly toneClass = computed(() => TONE_CLASSES[this.tone()]);
  readonly ageText = computed(() => {
    const age = this.age();
    if (age === null || age === undefined) return '?';
    return age === 0 ? '<1' : String(age);
  });
  readonly unit = computed(() => {
    const age = this.age();
    if (age === null || age === undefined) return '';
    return age <= 1 ? 'yr' : 'yrs';
  });
}
