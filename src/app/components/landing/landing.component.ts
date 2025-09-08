import { Component, inject } from '@angular/core';
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
  
  hover(side: string): void { 
    this.focus = side; 
  }
  
  navigate(side: string): void { 
    if (side === 'nominate') {
      this.router.navigate(['/nominate-family']);
    } else if (side === 'adopt') {
      this.router.navigate(['/adopt-family']);
    }
  }

  navigateToSignIn(): void {
    this.router.navigate(['/sign-in']);
  }

  // Expose auth state to template
  readonly isLoggedIn = this.authService.isLoggedIn;
} 