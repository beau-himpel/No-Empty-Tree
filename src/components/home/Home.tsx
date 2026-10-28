import { domAnimation, LazyMotion } from 'framer-motion';
import { useEffect, type CSSProperties } from 'react';
import { Navigate, Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router';
import { useAuth } from '../../lib/auth';
import { ConfirmHost } from '../../shared/confirm';
import { ToastHost } from '../../shared/Toast';
import { TreeMark } from '../../shared/TreeMark';
import { AuthPanel } from '../auth/AuthPanel';
import { Header } from '../header/Header';
import './Home.css';

const APP_NAME = 'No Empty Tree';

const STEPS = [
  { title: 'Choose a family', body: "See who's in each family and what's on their wish lists." },
  { title: 'Adopt gifts', body: 'Claim one gift or a whole list. They’re saved in My Adoptions.' },
  { title: 'Shop and give', body: 'Buy the gifts you adopted so every tree has something under it.' },
];

/** "My adoptions · No Empty Tree", or just the app name for pages without a title. */
function usePageTitle() {
  const matches = useMatches();
  const page = [...matches].reverse().find((match) => (match.handle as { title?: string })?.title)?.handle as
    | { title: string }
    | undefined;
  useEffect(() => {
    document.title = page ? `${page.title} · ${APP_NAME}` : APP_NAME;
  }, [page]);
}

/** The app shell when signed in, the landing page when not, and a splash while deciding. */
export default function Home() {
  const { isReady, isLoggedIn, connectionProblem } = useAuth();
  const { pathname } = useLocation();
  usePageTitle();

  if (!isReady) {
    // Restoring the stored session: show nothing rather than flash the sign-in screen
    return <Splash />;
  }

  if (isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 px-4 pb-32 pt-6 md:px-8 md:pb-16 md:pt-10 print:p-0">
          <div className="mx-auto w-full max-w-6xl">
            <LazyMotion features={domAnimation} strict>
              <Outlet />
            </LazyMotion>
          </div>
        </main>
        <ToastHost />
        <ConfirmHost />
        <ScrollRestoration />
      </div>
    );
  }

  // Every page needs an account: signed-out visitors land on the sign-in screen
  if (pathname !== '/') return <Navigate to="/" replace />;

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl px-5 md:px-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
      {/* Pitch */}
      <div className="flex flex-col pb-10 pt-6 lg:pb-14 lg:pt-8">
        <div className="flex items-center gap-2">
          <TreeMark className="h-7 w-7 text-pine-700" />
          <span className="text-[1.0625rem] font-semibold tracking-title text-stone-900">No Empty Tree</span>
        </div>

        <div className="mt-12 md:mt-16 lg:my-auto">
          <h1 className="text-[2.5rem] font-semibold leading-[1.04] tracking-display text-stone-900 animate-fade-up md:text-[3.75rem]">
            Give a family a Christmas to remember.
          </h1>
          <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-stone-500 animate-fade-up [animation-delay:60ms] md:text-lg">
            Families in our community share their holiday wish lists. Adopt a single gift or a whole list, so no
            family wakes up to an empty tree.
          </p>
          <HowItWorks className="mt-12 hidden lg:block" />
        </div>
      </div>

      {/* Sign in / create account */}
      <div className="pb-12 lg:flex lg:items-center lg:border-l lg:border-stone-100 lg:py-14 lg:pl-16">
        <div className="mx-auto w-full max-w-sm animate-fade-up [animation-delay:120ms] lg:mx-0">
          {connectionProblem && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900" role="alert">
              <i className="pi pi-exclamation-triangle mt-0.5 text-amber-600" aria-hidden="true" />
              <span>
                <span className="font-semibold">We can't reach the server right now.</span> Signing in may not work
                until it's back. Please try again in a few minutes.
              </span>
            </div>
          )}
          <AuthPanel />
        </div>
      </div>

      <HowItWorks className="border-t border-stone-100 pb-14 pt-10 lg:hidden" />
    </div>
  );
}

function HowItWorks({ className }: { className: string }) {
  return (
    <section className={className} aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="type-section-label">
        How it works
      </h2>
      <ol className="mt-5 space-y-6">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4 animate-fade-up" style={{ animationDelay: `${180 + i * 60}ms` }}>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-50 text-sm font-semibold tabular-nums text-pine-700"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span>
              <span className="block font-semibold tracking-snug text-stone-900">{step.title}</span>
              <span className="block text-[0.9375rem] text-stone-500">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Shown while the stored session is restored, and while the first page's code loads. */
export function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center" aria-busy="true">
      {/* An empty silhouette that fills in from the trunk up, on a loop */}
      <svg viewBox="0 0 24 24" className="splash-mark h-28 w-28" aria-hidden="true">
        <g className="fill-pine-100">
          <path d="M12 1.5 16.2 8H7.8L12 1.5Z" />
          <path d="M12 6 17.6 14.2H6.4L12 6Z" />
          <path d="M12 11 19 20H5L12 11Z" />
          <rect x="10.75" y="20" width="2.5" height="2.5" rx="0.5" />
        </g>
        <g className="fill-pine-700">
          <rect className="splash-part" style={{ '--part': 0 } as CSSProperties} x="10.75" y="20" width="2.5" height="2.5" rx="0.5" />
          <path className="splash-part" style={{ '--part': 1 } as CSSProperties} d="M12 11 19 20H5L12 11Z" />
          <path className="splash-part" style={{ '--part': 2 } as CSSProperties} d="M12 6 17.6 14.2H6.4L12 6Z" />
          <path className="splash-part" style={{ '--part': 3 } as CSSProperties} d="M12 1.5 16.2 8H7.8L12 1.5Z" />
        </g>
      </svg>
      <span className="sr-only" role="status">
        Loading No Empty Tree…
      </span>
    </div>
  );
}
