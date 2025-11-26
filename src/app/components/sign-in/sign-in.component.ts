import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { SignUpComponent } from '../sign-up/sign-up.component';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    ButtonModule,
    InputTextModule,
    ReactiveFormsModule,
    SignUpComponent
  ],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  
  signInForm: FormGroup;
  isLoading = signal(false);
  isSignUp = signal(false);
  showSignUp = signal(false);
  errorMessage = signal('');

  constructor() {
    this.signInForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorMessage.set(params['error']);
      } else if (params['message']) {
        this.errorMessage.set(params['message']);
      }
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
        const result = await this.authService.signUpWithEmail(email, password);
        if (result.user) {
          if (result.needsConfirmation) {
            this.errorMessage.set('Check your email for a confirmation link!');
          } else if (result.session) {
            this.router.navigate(['/']);
          } else {
            this.errorMessage.set('Account created! Please check your email for a confirmation link.');
          }
        } else {
          this.errorMessage.set('Failed to create account. Please try again.');
        }
      } else {
        await this.authService.signInWithEmail(email, password);
        this.router.navigate(['/']);
      }
    } catch (error: any) {
      console.error('Sign in failed:', error);
      // Provide more specific error messages
      let errorMsg = 'Failed to sign in. Please try again.';
      if (error?.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMsg = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMsg = 'Please check your email and confirm your account before signing in.';
        } else if (error.message.includes('User already registered')) {
          errorMsg = 'An account with this email already exists. Please sign in instead.';
        } else {
          errorMsg = error.message;
        }
      }
      this.errorMessage.set(errorMsg);
    } finally {
      this.isLoading.set(false);
    }
  }

  goToSignUp() {
    this.showSignUp.set(true);
  }
} 