import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
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
import { ChoiceGroupComponent, ChoiceOption } from '../../shared/choice-group.component';

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
})
export class AuthPanelComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly minPasswordLength = MIN_PASSWORD_LENGTH;

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

  showError(form: 'signin' | 'signup' | 'forgot', field: string): boolean {
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
      () => this.host.nativeElement.querySelector<HTMLElement>('.field-input-invalid')?.focus(),
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
