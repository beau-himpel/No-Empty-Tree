import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import {
  type AuthErrorKind,
  authErrorKind,
  authErrorMessage,
  resendConfirmation as sendConfirmationAgain,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle as startGoogleSignIn,
  signUpWithEmail,
} from '../../lib/auth';
import { PANEL_EASE, PANEL_OPEN_MS, prefersReducedMotion } from '../../lib/motion';
import { ChoiceGroup, type ChoiceOption } from '../../shared/ChoiceGroup';
import { isEmailAddress, notBlank, useAfterRender } from '../../shared/forms';
import './AuthPanel.css';
import { FieldError, PasswordInput } from './PasswordInput';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset-sent' | 'check-email';
type FormName = 'signin' | 'signup' | 'forgot';
type FieldKey = 'signin.email' | 'signin.password' | 'signup.name' | 'signup.email' | 'signup.password' | 'forgot.email';

export const MIN_PASSWORD_LENGTH = 6;

const MODE_OPTIONS: ChoiceOption<'signin' | 'signup'>[] = [
  { label: 'Sign in', value: 'signin' },
  { label: 'Create account', value: 'signup' },
];

const FORM_FIELDS: Record<FormName, FieldKey[]> = {
  signin: ['signin.email', 'signin.password'],
  signup: ['signup.name', 'signup.email', 'signup.password'],
  forgot: ['forgot.email'],
};

const isSignInOrUp = (mode: Mode): mode is 'signin' | 'signup' => mode === 'signin' || mode === 'signup';

export function AuthPanel() {
  const host = useRef<HTMLDivElement>(null);
  const formSwitcher = useRef<HTMLDivElement>(null);
  const heightAnimation = useRef<Animation | null>(null);
  const afterRender = useAfterRender();

  const [mode, setModeState] = useState<Mode>('signin');
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState<{ kind: AuthErrorKind; message: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<FieldKey>>(new Set());
  /** The address a confirmation or reset email was just sent to. */
  const [sentTo, setSentTo] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const [signIn, setSignIn] = useState({ email: '', password: '' });
  const [signUp, setSignUp] = useState({ name: '', email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');

  const invalid: Record<FieldKey, boolean> = {
    'signin.email': !isEmailAddress(signIn.email),
    'signin.password': signIn.password === '',
    'signup.name': !notBlank(signUp.name),
    'signup.email': !isEmailAddress(signUp.email),
    'signup.password': signUp.password.length < MIN_PASSWORD_LENGTH,
    'forgot.email': !isEmailAddress(forgotEmail),
  };

  const showError = (field: FieldKey) => {
    // Both sign-in forms stay rendered; only the one in use shows errors
    if (!field.startsWith(`${mode}.`)) return false;
    return invalid[field] && (touched.has(field) || submitted);
  };
  const touch = (field: FieldKey) => () =>
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));

  const currentEmail = () =>
    (mode === 'signin' ? signIn.email : mode === 'signup' ? signUp.email : mode === 'forgot' ? forgotEmail : '').trim();

  /**
   * Glides the panel between the two forms' heights so the controls below it move
   * smoothly; the forms themselves cross-fade in CSS. Measured from where the panel
   * is right now, so toggling again mid-animation reverses without a jump.
   */
  const animateFormSwitch = () => {
    const switcher = formSwitcher.current;
    if (!switcher || prefersReducedMotion()) return;
    const from = switcher.getBoundingClientRect().height;
    heightAnimation.current?.cancel();
    afterRender(() => {
      const to = switcher.getBoundingClientRect().height;
      // Clip while moving: the incoming form is taller than the panel until it finishes
      const animation = switcher.animate(
        [
          { height: `${from}px`, overflow: 'hidden' },
          { height: `${to}px`, overflow: 'hidden' },
        ],
        { duration: PANEL_OPEN_MS, easing: PANEL_EASE }
      );
      heightAnimation.current = animation;
      animation.onfinish = () => (heightAnimation.current = null);
    });
  };

  const setMode = (next: Mode) => {
    const email = currentEmail();
    if (isSignInOrUp(mode) && isSignInOrUp(next) && mode !== next) animateFormSwitch();
    setModeState(next);
    setError(null);
    setSubmitted(false);
    setShowPassword(false);
    setResendState('idle');
    // Carry the email over so switching modes never means retyping it
    if (email) {
      setSignIn((form) => ({ ...form, email }));
      setSignUp((form) => ({ ...form, email }));
      setForgotEmail(email);
    }
  };

  const validate = (form: FormName): boolean => {
    setSubmitted(true);
    setTouched((current) => new Set([...current, ...FORM_FIELDS[form]]));
    if (!FORM_FIELDS[form].some((field) => invalid[field])) return true;
    // Skip the inactive (inert) form, which may still hold touched fields
    afterRender(() =>
      host.current?.querySelector<HTMLElement>('form:not([inert]) .field-input-invalid')?.focus()
    );
    return false;
  };

  const run = async (action: () => Promise<void>, options: { keepBusyOnSuccess?: boolean } = {}) => {
    if (busy) return;
    setError(null);
    setBusy('email');
    try {
      await action();
      // Signing in swaps this whole screen for the app; keep the spinner until then
      if (!options.keepBusyOnSuccess) setBusy(null);
    } catch (runError) {
      setError({ kind: authErrorKind(runError), message: authErrorMessage(runError) });
      setBusy(null);
    }
  };

  const submitSignIn = (event: FormEvent) => {
    event.preventDefault();
    if (!validate('signin')) return;
    run(() => signInWithEmail(signIn.email.trim(), signIn.password), { keepBusyOnSuccess: true });
  };

  const submitSignUp = (event: FormEvent) => {
    event.preventDefault();
    if (!validate('signup')) return;
    const email = signUp.email.trim();
    run(async () => {
      const result = await signUpWithEmail(email, signUp.password, { full_name: signUp.name.trim() });
      if (result.needsConfirmation) {
        setSentTo(email);
        setMode('check-email');
      }
    });
  };

  const submitForgot = (event: FormEvent) => {
    event.preventDefault();
    if (!validate('forgot')) return;
    const email = forgotEmail.trim();
    run(async () => {
      await sendPasswordReset(email);
      setSentTo(email);
      setMode('reset-sent');
    });
  };

  const signInWithGoogle = async () => {
    if (busy) return;
    setError(null);
    setBusy('google');
    try {
      // Redirects away on success
      await startGoogleSignIn();
    } catch (googleError) {
      setError({ kind: authErrorKind(googleError), message: "Couldn't start Google sign-in. Please try again." });
      setBusy(null);
    }
  };

  const resendConfirmation = async () => {
    const email = sentTo || signIn.email.trim();
    if (!email || resendState === 'sending') return;
    setResendState('sending');
    try {
      await sendConfirmationAgain(email);
      setSentTo(email);
      setResendState('sent');
    } catch (resendError) {
      setResendState('idle');
      setError({ kind: authErrorKind(resendError), message: authErrorMessage(resendError) });
    }
  };

  const spinner = (label: string) => (
    <>
      <i className="pi pi-spin pi-spinner" aria-hidden="true" />
      {label}
    </>
  );

  if (mode === 'forgot') {
    return (
      <div ref={host} className="animate-fade-up">
        <BackButton onClick={() => setMode('signin')}>Back to sign in</BackButton>
        <h2 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-title text-stone-900">
          Reset your password
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-stone-500">
          Enter the email you signed up with and we'll send you a link to choose a new password.
        </p>

        {error && <ErrorBanner className="mt-6">{error.message}</ErrorBanner>}

        <form onSubmit={submitForgot} noValidate className="mt-6 space-y-6">
          <div>
            <label className="field-label" htmlFor="forgot-email">
              Email
            </label>
            <EmailInput
              id="forgot-email"
              autoComplete="email"
              value={forgotEmail}
              onChange={setForgotEmail}
              onBlur={touch('forgot.email')}
              invalid={showError('forgot.email')}
            />
            {showError('forgot.email') && <FieldError>Enter a valid email address</FieldError>}
          </div>
          <button type="submit" className="btn-dark btn-lg w-full" disabled={busy !== null}>
            {busy === 'email' ? spinner('Sending…') : 'Send reset link'}
          </button>
        </form>
      </div>
    );
  }

  if (mode === 'reset-sent' || mode === 'check-email') {
    const resetSent = mode === 'reset-sent';
    return (
      <div ref={host} className="flex flex-col items-center py-6 text-center animate-fade-up" role="status">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-pine-50 text-pine-700 animate-pop"
          aria-hidden="true"
        >
          <i className="pi pi-envelope text-xl" />
        </span>
        <h2 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-title text-stone-900">
          {resetSent ? 'Check your email' : 'Confirm your email'}
        </h2>
        {resetSent ? (
          <p className="mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-stone-500">
            If there's an account for <span className="font-medium text-stone-900">{sentTo}</span>, we've sent a link
            to reset your password. It can take a minute to arrive.
          </p>
        ) : (
          <p className="mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-stone-500">
            We sent a link to <span className="font-medium text-stone-900">{sentTo}</span>. Open it to finish creating
            your account.
          </p>
        )}
        {!resetSent && error && (
          <p className="field-error justify-center" role="alert">
            {error.message}
          </p>
        )}
        <div className="mt-8 flex w-full flex-col gap-2">
          <button type="button" className="btn-outline btn-lg w-full" onClick={() => setMode('signin')}>
            Back to sign in
          </button>
          {!resetSent && (
            <button
              type="button"
              className="btn-quiet btn-lg w-full"
              disabled={resendState !== 'idle'}
              onClick={resendConfirmation}
            >
              {resendState === 'sending' ? (
                spinner('Sending…')
              ) : resendState === 'sent' ? (
                <>
                  <i className="pi pi-check text-sm" aria-hidden="true" />
                  Sent again
                </>
              ) : (
                "Didn't get it? Send again"
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={host}
      style={{ '--switch-ms': `${PANEL_OPEN_MS}ms`, '--switch-ease': PANEL_EASE } as CSSProperties}
    >
      <span className="sr-only" id="auth-mode-label">
        Sign in or create an account
      </span>
      <ChoiceGroup
        options={MODE_OPTIONS}
        value={mode}
        onChange={setMode}
        labelledBy="auth-mode-label"
        indicatorMs={PANEL_OPEN_MS}
        indicatorEasing={PANEL_EASE}
      />

      {/* Height is animated when switching forms (animateFormSwitch). flow-root keeps the
          margins inside it from collapsing through, which would shift the layout by 24px
          the moment the clipped animation ends. */}
      <div ref={formSwitcher} className="flow-root">
        {error && (
          <ErrorBanner className="mt-6">
            {error.message}
            {error.kind === 'email_not_confirmed' ? (
              <button
                type="button"
                className="mt-1 block font-semibold text-berry-900 underline underline-offset-2"
                disabled={resendState !== 'idle'}
                onClick={resendConfirmation}
              >
                {resendState === 'sent' ? 'Confirmation email sent' : 'Send the confirmation email again'}
              </button>
            ) : error.kind === 'user_exists' ? (
              <button
                type="button"
                className="mt-1 block font-semibold text-berry-900 underline underline-offset-2"
                onClick={() => setMode('signin')}
              >
                Go to sign in
              </button>
            ) : null}
          </ErrorBanner>
        )}

        {/* Both forms stay rendered so they can cross-fade; the inactive one is hidden and inert.
            Clipped sideways so it can wait off to its side; the padding keeps focus rings visible. */}
        <div className="relative -mx-1.5 mt-6 overflow-x-clip px-1.5">
          <form
            onSubmit={submitSignIn}
            noValidate
            className={`auth-form space-y-5 ${mode !== 'signin' ? 'auth-form-hidden' : ''}`}
            data-side="start"
            inert={mode !== 'signin'}
          >
            <div>
              <label className="field-label" htmlFor="signin-email">
                Email
              </label>
              <EmailInput
                id="signin-email"
                autoComplete="username"
                value={signIn.email}
                onChange={(email) => setSignIn((form) => ({ ...form, email }))}
                onBlur={touch('signin.email')}
                invalid={showError('signin.email')}
              />
              {showError('signin.email') && <FieldError>Enter a valid email address</FieldError>}
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label className="field-label" htmlFor="signin-password">
                  Password
                </label>
                <button
                  type="button"
                  className="mb-1.5 text-sm font-semibold text-pine-700 hover:text-pine-800"
                  onClick={() => setMode('forgot')}
                >
                  Forgot password?
                </button>
              </div>
              <PasswordInput
                id="signin-password"
                autoComplete="current-password"
                value={signIn.password}
                onChange={(password) => setSignIn((form) => ({ ...form, password }))}
                onBlur={touch('signin.password')}
                invalid={showError('signin.password')}
                showPassword={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
              />
              {showError('signin.password') && <FieldError>Enter your password</FieldError>}
            </div>

            <button type="submit" className="btn-dark btn-lg w-full" disabled={busy !== null}>
              {busy === 'email' ? spinner('Signing in…') : 'Sign in'}
            </button>
          </form>

          <form
            onSubmit={submitSignUp}
            noValidate
            className={`auth-form space-y-5 ${mode !== 'signup' ? 'auth-form-hidden' : ''}`}
            data-side="end"
            inert={mode !== 'signup'}
          >
            <div>
              <label className="field-label" htmlFor="signup-name">
                Your name
              </label>
              <input
                className={`field-input ${showError('signup.name') ? 'field-input-invalid' : ''}`}
                id="signup-name"
                autoComplete="name"
                autoCapitalize="words"
                aria-describedby="signup-name-hint"
                aria-invalid={showError('signup.name') || undefined}
                value={signUp.name}
                onChange={(event) => setSignUp((form) => ({ ...form, name: event.target.value }))}
                onBlur={touch('signup.name')}
              />
              {showError('signup.name') ? (
                <FieldError>Enter your name</FieldError>
              ) : (
                <p className="field-hint" id="signup-name-hint">
                  Shown to other donors next to the gifts you adopt.
                </p>
              )}
            </div>

            <div>
              <label className="field-label" htmlFor="signup-email">
                Email
              </label>
              <EmailInput
                id="signup-email"
                autoComplete="email"
                value={signUp.email}
                onChange={(email) => setSignUp((form) => ({ ...form, email }))}
                onBlur={touch('signup.email')}
                invalid={showError('signup.email')}
              />
              {showError('signup.email') && <FieldError>Enter a valid email address</FieldError>}
            </div>

            <div>
              <label className="field-label" htmlFor="signup-password">
                Password
              </label>
              <PasswordInput
                id="signup-password"
                autoComplete="new-password"
                value={signUp.password}
                onChange={(password) => setSignUp((form) => ({ ...form, password }))}
                onBlur={touch('signup.password')}
                invalid={showError('signup.password')}
                describedBy="signup-password-hint"
                showPassword={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
              />
              {showError('signup.password') ? (
                <FieldError>Use at least {MIN_PASSWORD_LENGTH} characters</FieldError>
              ) : (
                <p className="field-hint" id="signup-password-hint">
                  At least {MIN_PASSWORD_LENGTH} characters.
                </p>
              )}
            </div>

            <button type="submit" className="btn-dark btn-lg w-full" disabled={busy !== null}>
              {busy === 'email' ? spinner('Creating account…') : 'Create account'}
            </button>
          </form>
        </div>
      </div>

      <div className="my-6 flex items-center gap-4" aria-hidden="true">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-sm text-stone-400">or</span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      <button type="button" className="btn-outline btn-lg w-full" disabled={busy !== null} onClick={signInWithGoogle}>
        {busy === 'google' ? (
          <i className="pi pi-spin pi-spinner" aria-hidden="true" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        Continue with Google
      </button>
    </div>
  );
}

function EmailInput({
  id,
  autoComplete,
  value,
  onChange,
  onBlur,
  invalid,
}: {
  id: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid: boolean;
}) {
  return (
    <input
      className={`field-input ${invalid ? 'field-input-invalid' : ''}`}
      id={id}
      type="email"
      inputMode="email"
      autoComplete={autoComplete}
      autoCapitalize="off"
      spellCheck={false}
      aria-invalid={invalid || undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="-ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 active:scale-95"
      onClick={onClick}
    >
      <i className="pi pi-chevron-left text-xs" aria-hidden="true" />
      {children}
    </button>
  );
}

function ErrorBanner({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl bg-berry-50 p-3.5 text-sm font-medium text-berry-800 animate-fade-in ${className}`}
      role="alert"
    >
      <i className="pi pi-exclamation-circle mt-0.5 text-berry-600" aria-hidden="true" />
      <span className="flex-1">{children}</span>
    </div>
  );
}
