import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
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
    CardModule,
    MessageModule,
    FormsModule
  ],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  name = signal('');
  email = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  
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
      await this.authService.signUpWithEmail(this.email(), this.password(), {
        full_name: this.name().trim()
      });
      this.errorMessage.set('Check your email for a confirmation link!');
    } catch (error: any) {
      console.error('Sign up failed:', error);
      this.errorMessage.set(error?.message || 'Failed to create account. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async signUpWithGoogle(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');
      await this.authService.signInWithGoogle();
    } catch (error) {
      console.error('Sign up failed:', error);
      this.errorMessage.set('Failed to sign up with Google. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  goToSignIn() {
    this.router.navigate(['/sign-in']);
  }
}
