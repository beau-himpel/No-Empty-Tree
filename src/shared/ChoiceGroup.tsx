import { useRef, type KeyboardEvent } from 'react';

export interface ChoiceOption<T> {
  label: string;
  value: T;
}

const BASE_CLASS =
  'relative z-[1] cursor-pointer select-none font-semibold transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Single-choice control rendered as a segmented control or as wrapping chips.
 * Behaves as an ARIA radio group: one tab stop, arrow keys move the selection.
 */
export function ChoiceGroup<T>({
  options,
  value,
  onChange,
  onBlur,
  variant = 'segmented',
  labelledBy,
  invalid = false,
  disabled = false,
  indicatorMs = 300,
  indicatorEasing = 'ease-out',
}: {
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  onBlur?: () => void;
  variant?: 'segmented' | 'chips';
  labelledBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** How long the segmented highlight takes to slide to a new choice. */
  indicatorMs?: number;
  indicatorEasing?: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const focusableIndex = Math.max(selectedIndex, 0);
  const segmented = variant === 'segmented';

  const select = (index: number) => {
    const option = options[index];
    if (!option || disabled) return;
    onChange(option.value);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[event.key];
    if (!step) return;
    event.preventDefault();
    const count = options.length;
    const next = (focusableIndex + step + count) % count;
    select(next);
    buttons.current[next]?.focus();
  };

  const optionClass = (selected: boolean) => {
    if (segmented) {
      return `${BASE_CLASS} rounded-lg py-2.5 text-[0.9375rem] ${
        selected ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'
      }`;
    }
    return selected
      ? `${BASE_CLASS} rounded-full border border-stone-900 bg-stone-900 px-4 py-2 text-sm text-white`
      : `${BASE_CLASS} rounded-full border px-4 py-2 text-sm text-stone-700 hover:border-stone-400 ${
          invalid ? 'border-berry-600' : 'border-stone-300'
        }`;
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy || undefined}
      aria-invalid={invalid || undefined}
      onKeyDown={onKeyDown}
      className={
        segmented
          ? `relative grid auto-cols-fr grid-flow-col rounded-xl bg-stone-100 p-1 ${invalid ? 'ring-1 ring-berry-600' : ''}`
          : 'flex flex-wrap gap-2'
      }
    >
      {segmented && (
        <span
          className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-lg bg-white shadow-sm transition-[transform,opacity]"
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            transitionDuration: `${indicatorMs}ms`,
            transitionTimingFunction: indicatorEasing,
            transform: `translateX(${selectedIndex * 100}%)`,
            opacity: selectedIndex < 0 ? 0 : 1,
          }}
          aria-hidden="true"
        />
      )}
      {options.map((option, i) => (
        <button
          key={option.label}
          ref={(element) => {
            buttons.current[i] = element;
          }}
          type="button"
          role="radio"
          aria-checked={i === selectedIndex}
          tabIndex={i === focusableIndex ? 0 : -1}
          disabled={disabled}
          className={optionClass(i === selectedIndex)}
          onClick={() => select(i)}
          onBlur={onBlur}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
