import { createStore, useStore } from './store';

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

const current = createStore<Toast | null>(null);
let nextId = 1;
let dismissTimer: ReturnType<typeof setTimeout> | undefined;

export function useToast(): Toast | null {
  return useStore(current);
}

/** One toast at a time, Robinhood-style: a new message replaces the current one. */
export const toast = {
  show(
    message: string,
    options: { tone?: Toast['tone']; action?: ToastAction; durationMs?: number } = {}
  ): void {
    clearTimeout(dismissTimer);
    const next: Toast = {
      id: nextId++,
      message,
      tone: options.tone ?? 'default',
      action: options.action,
      leaving: false,
    };
    current.set(next);

    const duration = options.durationMs ?? (options.action ? 6000 : 4000);
    dismissTimer = setTimeout(() => toast.dismiss(next.id), duration);
  },

  error(message: string): void {
    toast.show(message, { tone: 'error', durationMs: 6000 });
  },

  dismiss(id: number): void {
    const shown = current.get();
    if (!shown || shown.id !== id || shown.leaving) return;

    clearTimeout(dismissTimer);
    current.set({ ...shown, leaving: true });
    setTimeout(() => {
      if (current.get()?.id === id) current.set(null);
    }, LEAVE_MS);
  },

  /** Dismisses whatever is showing, e.g. an Undo that no longer applies. */
  clear(): void {
    const shown = current.get();
    if (shown) toast.dismiss(shown.id);
  },

  runAction(shown: Toast): void {
    shown.action?.run();
    toast.dismiss(shown.id);
  },
};
