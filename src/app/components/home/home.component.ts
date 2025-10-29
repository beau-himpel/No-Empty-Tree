import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../auth.service';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  
  isLoggedIn = this.authService.isLoggedIn;

  ngOnInit(): void {
    // Redirect to sign-in if not logged in and on root path
    if (!this.isLoggedIn()) {
      const currentUrl = this.router.url;
      // If on root path or empty path, redirect to sign-in
      if (currentUrl === '/' || currentUrl === '') {
        this.router.navigate(['/sign-in'], { replaceUrl: true });
      }
    }
  }
}
