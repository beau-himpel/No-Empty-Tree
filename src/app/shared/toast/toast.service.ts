import { Injectable, signal } from '@angular/core';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'error';
  action?: ToastAction;
  leaving: boolean;
}

const LEAVE_MS = 200;

/** One toast at a time, Robinhood-style: a new message replaces the current one. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private dismissTimer?: ReturnType<typeof setTimeout>;

  private readonly _current = signal<Toast | null>(null);
  readonly current = this._current.asReadonly();

  show(
    message: string,
    options: { tone?: Toast['tone']; action?: ToastAction; durationMs?: number } = {}
  ): void {
    clearTimeout(this.dismissTimer);
    const toast: Toast = {
      id: this.nextId++,
      message,
      tone: options.tone ?? 'default',
      action: options.action,
      leaving: false,
    };
    this._current.set(toast);

    const duration = options.durationMs ?? (options.action ? 6000 : 4000);
    this.dismissTimer = setTimeout(() => this.dismiss(toast.id), duration);
  }

  error(message: string): void {
    this.show(message, { tone: 'error', durationMs: 6000 });
  }

  dismiss(id: number): void {
    const toast = this._current();
    if (!toast || toast.id !== id || toast.leaving) return;

    clearTimeout(this.dismissTimer);
    this._current.set({ ...toast, leaving: true });
    setTimeout(() => {
      if (this._current()?.id === id) this._current.set(null);
    }, LEAVE_MS);
  }

  runAction(toast: Toast): void {
    toast.action?.run();
    this.dismiss(toast.id);
  }
}
