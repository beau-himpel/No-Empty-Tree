import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  async signInWithGoogle(): Promise<void> {
    try {
      // await this.authService.signInWithGoogle();
      this.router.navigate(['/landing']);
    } catch (error) {
      console.error('Sign in failed:', error);
      // You might want to show an error message to the user here
    }
  }
} 