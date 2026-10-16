import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { prefersReducedMotion } from './motion';

/** Counts smoothly toward its value whenever the value changes. */
@Component({
  selector: 'app-animated-number',
  standalone: true,
  template: `{{ formatted() }}`,
  host: { class: 'tabular-nums' },
})
export class AnimatedNumberComponent {
  readonly value = input.required<number>();
  readonly durationMs = input(900);

  private readonly display = signal(0);
  readonly formatted = computed(() => Math.round(this.display()).toLocaleString());

  private frame = 0;

  constructor() {
    effect(() => {
      const target = this.value();
      untracked(() => this.animateTo(target));
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }

  private animateTo(target: number): void {
    cancelAnimationFrame(this.frame);
    const from = this.display();
    if (from === target || prefersReducedMotion()) {
      this.display.set(target);
      return;
    }

    const duration = this.durationMs();
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      this.display.set(from + (target - from) * eased);
      if (progress < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }
}
