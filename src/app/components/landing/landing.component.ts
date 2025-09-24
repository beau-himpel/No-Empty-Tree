import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  
  focus = '';
  readonly isLoggedIn = this.authService.isLoggedIn;

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
    
  hover(side: string) { 
    this.focus = side; 
  }
  
  navigate(side: string) { 
    if (side === 'nominate') {
      this.router.navigate(['/nominate-family']);
    } else if (side === 'adopt') {
      this.router.navigate(['/adopt-family']);
    }
  }
} 