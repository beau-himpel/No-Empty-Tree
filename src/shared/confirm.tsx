import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { isMobile } from '../lib/motion';
import { createStore, useStore } from '../lib/store';
import './confirm.css';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'adopt' | 'dark';
  /** PrimeIcons class shown in a badge above the title, e.g. `pi-heart-fill`. */
  icon?: string;
}

interface ConfirmRequest extends ConfirmOptions {
  id: number;
  asSheet: boolean;
  resolve: (confirmed: boolean) => void;
}

// Fallback in case animationend never fires (e.g. tab hidden mid-animation)
const LEAVE_FALLBACK_MS = 400;

const current = createStore<ConfirmRequest | null>(null);
let nextId = 1;

/**
 * Asks the user to confirm: a bottom sheet on phones, a centered card on larger screens.
 * Resolves true only when the user explicitly confirms.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  current.get()?.resolve(false);
  return new Promise((resolve) => {
    current.set({ ...options, id: nextId++, asSheet: isMobile(), resolve });
  });
}

export function ConfirmHost() {
  const request = useStore(current);
  if (!request) return null;
  return createPortal(<ConfirmSheet key={request.id} request={request} />, document.body);
}

function ConfirmSheet({ request }: { request: ConfirmRequest }) {
  const [leaving, setLeaving] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const result = useRef(false);
  const finished = useRef(false);
  const dark = request.tone === 'dark';

  useEffect(() => {
    const restoreTo = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      root.style.overflow = previousOverflow;
      restoreTo?.focus?.();
    };
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    request.resolve(result.current);
    if (current.get()?.id === request.id) current.set(null);
  };

  const close = (confirmed: boolean) => {
    if (leaving) return;
    result.current = confirmed;
    setLeaving(true);
    setTimeout(finish, LEAVE_FALLBACK_MS);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(false);
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    // Keep focus inside the dialog
    const focusable = panel.current.querySelectorAll<HTMLElement>('button:not([disabled])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000]" onKeyDown={onKeyDown}>
      <div
        className={`confirm-backdrop absolute inset-0 ${leaving ? 'is-leaving' : ''}`}
        onClick={() => close(false)}
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute inset-x-0 flex justify-center ${
          request.asSheet ? 'bottom-0' : 'inset-y-0 items-center md:px-4'
        }`}
      >
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-sheet-title"
          tabIndex={-1}
          className={`confirm-panel pointer-events-auto w-full outline-none md:max-w-[26rem] ${
            request.asSheet ? 'is-sheet' : ''
          } ${leaving ? 'is-leaving' : ''}`}
          onAnimationEnd={(event) => {
            if (leaving && event.target === event.currentTarget) finish();
          }}
        >
          {request.asSheet && <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-stone-200" aria-hidden="true" />}
          {request.icon && (
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                dark ? 'bg-stone-100' : 'bg-berry-50'
              }`}
            >
              <i
                className={`pi text-xl ${request.icon} ${dark ? 'text-stone-700' : 'text-berry-600'}`}
                aria-hidden="true"
              />
            </div>
          )}
          <h2
            id="confirm-sheet-title"
            className="text-[1.375rem] font-semibold leading-tight tracking-title text-stone-900"
          >
            {request.title}
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-stone-500">{request.message}</p>
          <div className="mt-7 flex flex-col gap-1.5">
            <button
              type="button"
              className={`btn-lg w-full ${dark ? 'btn-dark' : 'btn-adopt'}`}
              onClick={() => close(true)}
            >
              {request.confirmLabel}
            </button>
            <button type="button" className="btn-quiet btn-lg w-full" onClick={() => close(false)}>
              {request.cancelLabel ?? 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
