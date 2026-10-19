import {
  Component,
  computed,
  ElementRef,
  forwardRef,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface ChoiceOption<T> {
  label: string;
  value: T;
}

/**
 * Single-choice control rendered as a segmented control or as wrapping chips.
 * Behaves as an ARIA radio group: one tab stop, arrow keys move the selection.
 */
@Component({
  selector: 'app-choice-group',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChoiceGroupComponent),
      multi: true,
    },
  ],
  template: `
    <div
      role="radiogroup"
      [attr.aria-labelledby]="labelledBy() || null"
      [attr.aria-invalid]="invalid() || null"
      (keydown)="onKeydown($event)"
      [class]="variant() === 'segmented' ? segmentedClass() : 'flex flex-wrap gap-2'"
    >
      @if (variant() === 'segmented') {
      <span
        class="pointer-events-none absolute bottom-1 left-1 top-1 rounded-lg bg-white shadow-sm transition-[transform,opacity] duration-300 ease-out"
        [style.width]="indicatorWidth()"
        [style.transform]="'translateX(' + selectedIndex() * 100 + '%)'"
        [style.opacity]="selectedIndex() < 0 ? 0 : 1"
        aria-hidden="true"
      ></span>
      }
      @for (option of options(); track option.label; let i = $index) {
      <button
        #choice
        type="button"
        role="radio"
        [attr.aria-checked]="i === selectedIndex()"
        [tabindex]="i === focusableIndex() ? 0 : -1"
        [disabled]="disabled()"
        [class]="i === selectedIndex() ? selectedClass() : idleClass()"
        (click)="select(i)"
        (blur)="onTouched()"
      >
        {{ option.label }}
      </button>
      }
    </div>
  `,
})
export class ChoiceGroupComponent<T> implements ControlValueAccessor {
  readonly options = input.required<ChoiceOption<T>[]>();
  readonly variant = input<'segmented' | 'chips'>('segmented');
  readonly labelledBy = input<string>();
  readonly invalid = input(false);

  private readonly value = signal<T | null>(null);
  readonly disabled = signal(false);
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('choice');

  readonly selectedIndex = computed(() =>
    this.options().findIndex((option) => option.value === this.value())
  );
  readonly focusableIndex = computed(() => Math.max(this.selectedIndex(), 0));
  readonly indicatorWidth = computed(
    () => `calc((100% - 0.5rem) / ${this.options().length})`
  );

  readonly segmentedClass = computed(
    () =>
      'relative grid auto-cols-fr grid-flow-col rounded-xl bg-stone-100 p-1 ' +
      (this.invalid() ? 'ring-1 ring-berry-600' : '')
  );

  private readonly baseClass =
    'relative z-[1] cursor-pointer select-none font-semibold transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:opacity-60';

  readonly selectedClass = computed(() =>
    this.variant() === 'segmented'
      ? `${this.baseClass} rounded-lg py-2.5 text-[0.9375rem] text-stone-900`
      : `${this.baseClass} rounded-full border border-stone-900 bg-stone-900 px-4 py-2 text-sm text-white`
  );

  readonly idleClass = computed(() =>
    this.variant() === 'segmented'
      ? `${this.baseClass} rounded-lg py-2.5 text-[0.9375rem] text-stone-500 hover:text-stone-700`
      : `${this.baseClass} rounded-full border px-4 py-2 text-sm text-stone-700 hover:border-stone-400 ${
          this.invalid() ? 'border-berry-600' : 'border-stone-300'
        }`
  );

  private onChange: (value: T) => void = () => {};
  onTouched: () => void = () => {};

  select(index: number): void {
    const option = this.options()[index];
    if (!option || this.disabled()) return;
    this.value.set(option.value);
    this.onChange(option.value);
  }

  onKeydown(event: KeyboardEvent): void {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const count = this.options().length;
    const next = (this.focusableIndex() + step + count) % count;
    this.select(next);
    this.buttons()[next]?.nativeElement.focus();
  }

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
