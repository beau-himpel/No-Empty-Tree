import { toast, useToast } from '../lib/toast';
import './Toast.css';

export function ToastHost() {
  const current = useToast();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6 print:hidden"
      role="status"
      aria-live="polite"
    >
      {current && (
        <div
          key={current.id}
          className={`toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-[0.9375rem] font-medium text-white shadow-lg ${
            current.tone === 'error' ? 'bg-berry-700' : 'bg-stone-900'
          } ${current.leaving ? 'toast-leaving' : ''}`}
        >
          <i
            className={`pi shrink-0 ${
              current.tone === 'error' ? 'pi-exclamation-circle' : 'pi-check-circle text-pine-300'
            }`}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">{current.message}</span>
          {current.action && (
            <button
              type="button"
              className="-my-1 shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-pine-300 transition-colors hover:bg-white/10 active:scale-95"
              onClick={() => toast.runAction(current)}
            >
              {current.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
