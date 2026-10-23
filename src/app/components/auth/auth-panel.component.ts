import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthErrorKind, authErrorKind, authErrorMessage, AuthService } from '../../auth.service';
import { PANEL_EASE, PANEL_OPEN_MS } from '../../shared/animations';
import { ChoiceGroupComponent, ChoiceOption } from '../../shared/choice-group.component';
import { prefersReducedMotion } from '../../shared/motion';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset-sent' | 'check-email';

export const MIN_PASSWORD_LENGTH = 6;

const emailAddress = (control: AbstractControl) => {
  const value = String(control.value ?? '').trim();
  return value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : { email: true };
};

const notBlank = (control: AbstractControl) =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

@Component({
  selector: 'app-auth-panel',
  standalone: true,
  imports: [ReactiveFormsModule, ChoiceGroupComponent, NgTemplateOutlet],
  templateUrl: './auth-panel.component.html',
  host: {
    '[style.--switch-ms]': 'switchMs + "ms"',
    '[style.--switch-ease]': 'switchEase',
  },
  styles: `
    /* Sign in sits left of Create account (as in the toggle), so each slides out toward its side */
    .auth-form {
      transition:
        opacity 380ms ease-out 120ms,
        transform var(--switch-ms) var(--switch-ease),
        visibility 0s;
    }
    .auth-form-hidden {
      position: absolute;
      inset: 0 0.375rem auto; /* inside the wrapper's px-1.5 */
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition:
        opacity 200ms ease-in,
        transform var(--switch-ms) var(--switch-ease),
        visibility 0s linear var(--switch-ms);
    }
    .auth-form-hidden[data-side='start'] {
      transform: translateX(-2.5rem);
    }
    .auth-form-hidden[data-side='end'] {
      transform: translateX(2.5rem);
    }
    @media (prefers-reduced-motion: reduce) {
      .auth-form,
      .auth-form-hidden {
        transition: none;
        transform: none;
      }
    }
  `,
})
export class AuthPanelComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly minPasswordLength = MIN_PASSWORD_LENGTH;
  readonly switchMs = PANEL_OPEN_MS;
  readonly switchEase = PANEL_EASE;

  private readonly formSwitcher = viewChild<ElementRef<HTMLElement>>('formSwitcher');
  private heightAnimation: Animation | null = null;

  readonly mode = signal<Mode>('signin');
  readonly modeControl = new FormControl<'signin' | 'signup'>('signin', { nonNullable: true });
  readonly modeOptions: ChoiceOption<'signin' | 'signup'>[] = [
    { label: 'Sign in', value: 'signin' },
    { label: 'Create account', value: 'signup' },
  ];

  readonly busy = signal<'email' | 'google' | null>(null);
  readonly error = signal<{ kind: AuthErrorKind; message: string } | null>(null);
  readonly submitted = signal(false);
  readonly showPassword = signal(false);
  /** The address a confirmation or reset email was just sent to. */
  readonly sentTo = signal('');
  readonly resendState = signal<'idle' | 'sending' | 'sent'>('idle');

  readonly signInForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, emailAddress]],
    password: ['', [Validators.required]],
  });

  readonly signUpForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank]],
    email: ['', [Validators.required, emailAddress]],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, emailAddress]],
  });

  constructor() {
    this.modeControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((mode) => this.setMode(mode));
  }

  setMode(mode: Mode): void {
    const email = this.currentEmail();
    const isFormSwitch = this.isSignInOrUp(this.mode()) && this.isSignInOrUp(mode) && this.mode() !== mode;
    if (isFormSwitch) this.animateFormSwitch();
    this.mode.set(mode);
    this.error.set(null);
    this.submitted.set(false);
    this.showPassword.set(false);
    this.resendState.set('idle');
    if (mode === 'signin' || mode === 'signup') {
      this.modeControl.setValue(mode, { emitEvent: false });
    }
    // Carry the email over so switching modes never means retyping it
    if (email) {
      this.signInForm.controls.email.setValue(email);
      this.signUpForm.controls.email.setValue(email);
      this.forgotForm.controls.email.setValue(email);
    }
  }

  private isSignInOrUp(mode: Mode): boolean {
    return mode === 'signin' || mode === 'signup';
  }

  /**
   * Glides the panel between the two forms' heights so the controls below it move
   * smoothly; the forms themselves cross-fade in CSS. Measured from where the panel
   * is right now, so toggling again mid-animation reverses without a jump.
   */
  private animateFormSwitch(): void {
    const switcher = this.formSwitcher()?.nativeElement;
    if (!switcher || prefersReducedMotion()) return;
    const from = switcher.getBoundingClientRect().height;
    this.heightAnimation?.cancel();
    afterNextRender(
      () => {
        const to = switcher.getBoundingClientRect().height;
        // Clip while moving: the incoming form is taller than the panel until it finishes
        this.heightAnimation = switcher.animate(
          [
            { height: `${from}px`, overflow: 'hidden' },
            { height: `${to}px`, overflow: 'hidden' },
          ],
          { duration: PANEL_OPEN_MS, easing: PANEL_EASE }
        );
        this.heightAnimation.onfinish = () => (this.heightAnimation = null);
      },
      { injector: this.injector }
    );
  }

  showError(form: 'signin' | 'signup' | 'forgot', field: string): boolean {
    // Both sign-in forms stay rendered; only the one in use shows errors
    if (form !== this.mode()) return false;
    const group: AbstractControl =
      form === 'signin' ? this.signInForm : form === 'signup' ? this.signUpForm : this.forgotForm;
    const control = group.get(field);
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  async submitSignIn(): Promise<void> {
    if (!this.validate(this.signInForm)) return;
    const { email, password } = this.signInForm.getRawValue();
    await this.run(() => this.authService.signInWithEmail(email.trim(), password), {
      keepBusyOnSuccess: true,
    });
  }

  async submitSignUp(): Promise<void> {
    if (!this.validate(this.signUpForm)) return;
    const { name, email, password } = this.signUpForm.getRawValue();
    await this.run(async () => {
      const result = await this.authService.signUpWithEmail(email.trim(), password, {
        full_name: name.trim(),
      });
      if (result.needsConfirmation) {
        this.sentTo.set(email.trim());
        this.setMode('check-email');
      }
    });
  }

  async submitForgot(): Promise<void> {
    if (!this.validate(this.forgotForm)) return;
    const email = this.forgotForm.getRawValue().email.trim();
    await this.run(async () => {
      await this.authService.sendPasswordReset(email);
      this.sentTo.set(email);
      this.setMode('reset-sent');
    });
  }

  async signInWithGoogle(): Promise<void> {
    if (this.busy()) return;
    this.error.set(null);
    this.busy.set('google');
    try {
      // Redirects away on success
      await this.authService.signInWithGoogle();
    } catch (error) {
      this.error.set({ kind: authErrorKind(error), message: "Couldn't start Google sign-in. Please try again." });
      this.busy.set(null);
    }
  }

  async resendConfirmation(): Promise<void> {
    const email = this.sentTo() || this.signInForm.getRawValue().email.trim();
    if (!email || this.resendState() === 'sending') return;
    this.resendState.set('sending');
    try {
      await this.authService.resendConfirmation(email);
      this.sentTo.set(email);
      this.resendState.set('sent');
    } catch (error) {
      this.resendState.set('idle');
      this.error.set({ kind: authErrorKind(error), message: authErrorMessage(error) });
    }
  }

  private currentEmail(): string {
    const byMode = {
      signin: this.signInForm,
      signup: this.signUpForm,
      forgot: this.forgotForm,
    } as const;
    const form = byMode[this.mode() as keyof typeof byMode];
    return form?.controls.email.value.trim() ?? '';
  }

  private validate(form: { invalid: boolean; markAllAsTouched(): void }): boolean {
    this.submitted.set(true);
    form.markAllAsTouched();
    if (!form.invalid) return true;
    afterNextRender(
      // Skip the inactive (inert) form, which may still hold touched fields
      () => this.host.nativeElement.querySelector<HTMLElement>('form:not([inert]) .field-input-invalid')?.focus(),
      { injector: this.injector }
    );
    return false;
  }

  private async run(
    action: () => Promise<void>,
    options: { keepBusyOnSuccess?: boolean } = {}
  ): Promise<void> {
    if (this.busy()) return;
    this.error.set(null);
    this.busy.set('email');
    try {
      await action();
      // Signing in swaps this whole screen for the app; keep the spinner until then
      if (!options.keepBusyOnSuccess) this.busy.set(null);
    } catch (error) {
      this.error.set({ kind: authErrorKind(error), message: authErrorMessage(error) });
      this.busy.set(null);
    }
  }
}
