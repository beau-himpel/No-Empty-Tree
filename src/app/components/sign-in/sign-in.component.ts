import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    MessageModule,
    ReactiveFormsModule
  ],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  
  signInForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  isSignUp = signal(false);

  constructor() {
    this.signInForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  
  async signInWithGoogle(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');
      await this.authService.signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
      this.errorMessage.set('Failed to sign in with Google. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async signInWithEmail(): Promise<void> {
    if (this.signInForm.invalid) {
      return;
    }

    const { email, password } = this.signInForm.value;

    try {
      this.isLoading.set(true);
      this.errorMessage.set('');
      
      if (this.isSignUp()) {
        await this.authService.signUpWithEmail(email, password);
        this.errorMessage.set('Check your email for a confirmation link!');
      } else {
        await this.authService.signInWithEmail(email, password);
        this.router.navigate(['/']);
      }
    } catch (error: any) {
      console.error('Sign in failed:', error);
      this.errorMessage.set(error?.message || 'Failed to sign in. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  goToSignUp() {
    this.router.navigate(['/sign-up']);
  }
} 