import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  
  currentRoute: string = '';

  constructor() {
    // Subscribe to router events to track current route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
      });
    
    // Set initial route
    this.currentRoute = this.router.url;
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route;
  }

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
      await this.authService.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      // You might want to show an error message to the user here
    }
  }
} 