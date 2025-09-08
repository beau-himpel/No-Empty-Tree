import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  navigateToAdopt(): void {
    this.router.navigate(['/adopt-family']);
  }

  navigateToNominate(): void {
    this.router.navigate(['/nominate-family']);
  }

  navigateToMyAdoptions(): void {
    this.router.navigate(['/my-adoptions']);
  }

  async logout(): Promise<void> {
    try {
      // await this.authService.logout();
      this.router.navigate(['/sign-in']);
    } catch (error) {
      console.error('Logout failed:', error);
      // You might want to show an error message to the user here
    }
  }
} 