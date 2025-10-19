import { Component, inject, signal, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../auth.service';
import { filter } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { MOBILE_BREAKPOINT } from '../../shared/constants';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MenuModule, ButtonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  
  @ViewChild('menu') menu!: Menu;
  
  currentRoute: string = '';
  isMobile = signal(false);

  menuItems: MenuItem[] = [
    {
      label: 'Adopt Families',
      icon: 'pi pi-users',
      command: () => this.navigateToAdopt()
    },
    {
      label: 'Nominate Family',
      icon: 'pi pi-plus',
      command: () => this.navigateToNominate()
    },
    {
      label: 'My Adoptions',
      icon: 'pi pi-heart',
      command: () => this.navigateToMyAdoptions()
    },
    {
      separator: true
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ];

  constructor() {
    // Subscribe to router events to track current route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
      });
    
    // Set initial route
    this.currentRoute = this.router.url;

    // Watch for screen size changes
    this.breakpointObserver.observe([MOBILE_BREAKPOINT])
      .subscribe((result: any) => {
        this.isMobile.set(result.matches);
        // Close menu when switching to desktop
        if (!result.matches && this.menu) {
          this.menu.hide();
        }
      });
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route;
  }

  navigateToAdopt() {
    this.router.navigate(['/adopt-family']);
  }

  navigateToNominate() {
    this.router.navigate(['/nominate-family']);
  }

  navigateToMyAdoptions() {
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

  toggleMenu(event: Event): void {
    if (this.menu) {
      this.menu.toggle(event);
    }
  }
} 