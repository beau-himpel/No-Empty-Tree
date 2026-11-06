import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6"
      role="status"
      aria-live="polite"
    >
      @if (toastService.current(); as toast) {
        <div
          class="toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-[0.9375rem] font-medium text-white shadow-lg"
          [class.bg-stone-900]="toast.tone === 'default'"
          [class.bg-berry-700]="toast.tone === 'error'"
          [class.toast-leaving]="toast.leaving"
        >
          <i
            class="pi shrink-0"
            [class.pi-check-circle]="toast.tone === 'default'"
            [class.text-pine-300]="toast.tone === 'default'"
            [class.pi-exclamation-circle]="toast.tone === 'error'"
            aria-hidden="true"
          ></i>
          <span class="min-w-0 flex-1">{{ toast.message }}</span>
          @if (toast.action) {
            <button
              type="button"
              class="-my-1 shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-pine-300 transition-colors hover:bg-white/10 active:scale-95"
              (click)="toastService.runAction(toast)"
            >
              {{ toast.action.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .toast {
      animation: toast-in 320ms cubic-bezier(0.2, 0, 0, 1) both;
    }

    .toast-leaving {
      animation: toast-out 200ms ease-in both;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.96);
      }
    }

    @keyframes toast-out {
      to {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }
  `,
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
