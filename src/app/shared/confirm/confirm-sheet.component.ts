import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'adopt' | 'dark';
  /** PrimeIcons class shown in a badge above the title, e.g. `pi-heart-fill`. */
  icon?: string;
}

export interface ConfirmSheetData extends ConfirmOptions {
  asSheet: boolean;
}

// Fallback in case animationend never fires (e.g. tab hidden mid-animation)
const LEAVE_FALLBACK_MS = 400;

@Component({
  selector: 'app-confirm-sheet',
  standalone: true,
  template: `
    <div
      class="panel"
      [class.is-sheet]="data.asSheet"
      [class.is-leaving]="leaving()"
      (animationend)="onAnimationEnd($event)"
    >
      @if (data.asSheet) {
        <div
          class="mx-auto mb-6 h-1 w-10 rounded-full bg-stone-200"
          aria-hidden="true"
        ></div>
      }
      @if (data.icon) {
        <div
          class="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          [class.bg-berry-50]="data.tone !== 'dark'"
          [class.bg-stone-100]="data.tone === 'dark'"
        >
          <i
            class="pi text-xl {{ data.icon }}"
            [class.text-berry-600]="data.tone !== 'dark'"
            [class.text-stone-700]="data.tone === 'dark'"
            aria-hidden="true"
          ></i>
        </div>
      }
      <h2
        id="confirm-sheet-title"
        class="text-[1.375rem] font-semibold leading-tight tracking-title text-stone-900"
      >
        {{ data.title }}
      </h2>
      <p class="mt-2 text-[0.9375rem] leading-relaxed text-stone-500">
        {{ data.message }}
      </p>
      <div class="mt-7 flex flex-col gap-1.5">
        <button
          type="button"
          class="btn-lg w-full"
          [class.btn-adopt]="data.tone !== 'dark'"
          [class.btn-dark]="data.tone === 'dark'"
          (click)="close(true)"
        >
          {{ data.confirmLabel }}
        </button>
        <button
          type="button"
          class="btn-quiet btn-lg w-full"
          (click)="close(false)"
        >
          {{ data.cancelLabel ?? 'Cancel' }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .panel {
      background: #fff;
      padding: 1.5rem;
      border-radius: 1.5rem;
      box-shadow: 0 24px 48px -12px rgb(12 10 9 / 0.25);
      animation: card-in 220ms cubic-bezier(0.2, 0, 0, 1) both;
    }

    .panel.is-sheet {
      border-radius: 1.5rem 1.5rem 0 0;
      padding: 0.75rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
      animation: sheet-up 380ms cubic-bezier(0.32, 0.72, 0, 1) both;
    }

    .panel.is-leaving {
      animation: card-out 160ms ease-in both;
    }

    .panel.is-sheet.is-leaving {
      animation: sheet-down 260ms cubic-bezier(0.32, 0.72, 0, 1) both;
    }

    @keyframes sheet-up {
      from {
        transform: translateY(100%);
      }
    }

    @keyframes sheet-down {
      to {
        transform: translateY(100%);
      }
    }

    @keyframes card-in {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }

    @keyframes card-out {
      to {
        opacity: 0;
        transform: translateY(4px) scale(0.98);
      }
    }
  `,
})
export class ConfirmSheetComponent {
  readonly data = inject<ConfirmSheetData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);

  readonly leaving = signal(false);
  private result = false;

  constructor() {
    this.dialogRef.backdropClick
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.close(false));
    this.dialogRef.keydownEvents
      .pipe(
        filter((event) => event.key === 'Escape'),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.close(false));
  }

  close(result: boolean): void {
    if (this.leaving()) return;
    this.result = result;
    this.leaving.set(true);
    this.dialogRef.overlayRef.detachBackdrop();
    setTimeout(() => this.finish(), LEAVE_FALLBACK_MS);
  }

  onAnimationEnd(event: AnimationEvent): void {
    if (this.leaving() && event.target === event.currentTarget) {
      this.finish();
    }
  }

  private finish(): void {
    this.dialogRef.close(this.result);
  }
}
