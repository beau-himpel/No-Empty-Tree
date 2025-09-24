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
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    MessageModule,
    FormsModule
  ],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  email = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  isSignUp = signal(false);
  
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
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');
      
      if (this.isSignUp()) {
        await this.authService.signUpWithEmail(this.email(), this.password());
        this.errorMessage.set('Check your email for a confirmation link!');
      } else {
        await this.authService.signInWithEmail(this.email(), this.password());
        this.router.navigate(['/landing']);
      }
    } catch (error: any) {
      console.error('Sign in failed:', error);
      this.errorMessage.set(error?.message || 'Failed to sign in. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleSignUp(): void {
    this.isSignUp.set(!this.isSignUp());
    this.errorMessage.set('');
  }
} 