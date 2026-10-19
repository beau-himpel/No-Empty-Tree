import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { authErrorMessage, AuthService } from '../../auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { MIN_PASSWORD_LENGTH } from './auth-panel.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="mx-auto w-full max-w-md animate-fade-up">
      <h1 class="type-page-title">Choose a new password</h1>
      <p class="mt-3 text-[0.9375rem] leading-relaxed text-stone-500">
        You're signed in as <span class="font-medium text-stone-900">{{ email() }}</span>. Pick a
        new password for next time.
      </p>

      @if (error()) {
      <div class="mt-6 flex items-start gap-3 rounded-xl bg-berry-50 p-3.5 text-sm font-medium text-berry-800 animate-fade-in" role="alert">
        <i class="pi pi-exclamation-circle mt-0.5 text-berry-600" aria-hidden="true"></i>
        <span>{{ error() }}</span>
      </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 space-y-6">
        <div>
          <label class="field-label" for="new-password">New password</label>
          <div class="relative">
            <input
              class="field-input pr-12"
              [class.field-input-invalid]="showError()"
              id="new-password"
              [type]="showPassword() ? 'text' : 'password'"
              autocomplete="new-password"
              autocapitalize="off"
              spellcheck="false"
              formControlName="password"
              aria-describedby="new-password-hint"
              [attr.aria-invalid]="showError() || null"
            />
            <button
              type="button"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2.5 text-stone-400 transition-colors hover:text-stone-700"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              [attr.aria-pressed]="showPassword()"
              (click)="showPassword.set(!showPassword())"
            >
              <i class="pi text-base" [class.pi-eye]="!showPassword()" [class.pi-eye-slash]="showPassword()" aria-hidden="true"></i>
            </button>
          </div>
          @if (showError()) {
          <p class="field-error"><i class="pi pi-exclamation-circle text-xs" aria-hidden="true"></i>Use at least {{ minLength }} characters</p>
          } @else {
          <p class="field-hint" id="new-password-hint">At least {{ minLength }} characters.</p>
          }
        </div>

        <button type="submit" class="btn-dark btn-lg w-full" [disabled]="saving()">
          @if (saving()) {
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>Saving…
          } @else { Update password }
        </button>
      </form>
    </section>
  `,
})
export class ResetPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly minLength = MIN_PASSWORD_LENGTH;
  readonly email = this.authService.userEmail;
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  showError(): boolean {
    const control = this.form.controls.password;
    return control.invalid && (control.touched || this.submitted());
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.authService.updatePassword(this.form.getRawValue().password);
      this.toast.show('Password updated');
      this.router.navigate(['/adopt-family']);
    } catch (error) {
      this.error.set(authErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }
}
