import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    FormsModule
  ],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent {
  @Output() showSignIn = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  name = signal('');
  email = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  hasSignedUp = signal(false);

  async signUpWithEmail(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');
      
      // Validate form
      if (!this.name().trim()) {
        this.errorMessage.set('Name is required.');
        return;
      }
      
      if (!this.email().trim()) {
        this.errorMessage.set('Email is required.');
        return;
      }
      
      if (!this.password().trim()) {
        this.errorMessage.set('Password is required.');
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email())) {
        this.errorMessage.set('Please enter a valid email address.');
        return;
      }
      
      // Password validation (minimum 6 characters)
      if (this.password().length < 6) {
        this.errorMessage.set('Password must be at least 6 characters long.');
        return;
      }
      
      // Sign up with user metadata including the name
      const result = await this.authService.signUpWithEmail(this.email(), this.password(), {
        full_name: this.name().trim()
      });
      
      // Check if signup was successful
      if (result.user) {
        if (result.needsConfirmation) {
          // Email confirmation is required
          this.hasSignedUp.set(true);
        } else if (result.session) {
          // User was created and logged in immediately (email confirmation disabled)
          this.router.navigate(['/']);
        } else {
          // User created but no session (unlikely but handle it)
          this.errorMessage.set('Account created! Please check your email for a confirmation link.');
        }
      } else {
        // No user was created - this shouldn't happen if there's no error
        this.errorMessage.set('Failed to create account. Please try again.');
      }
    } catch (error: any) {
      console.error('Sign up failed:', error);
      // Provide more specific error messages
      let errorMsg = 'Failed to create account. Please try again.';
      if (error?.message) {
        if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
          errorMsg = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message.includes('Password')) {
          errorMsg = error.message;
        } else if (error.message.includes('Invalid email')) {
          errorMsg = 'Please enter a valid email address.';
        } else {
          errorMsg = error.message;
        }
      }
      this.errorMessage.set(errorMsg);
    } finally {
      this.isLoading.set(false);
    }
  }

  navigateToSignIn() {
    this.router.navigate(['/sign-in']);
  }

  goToSignIn() {
    this.showSignIn.emit();
  }
}
