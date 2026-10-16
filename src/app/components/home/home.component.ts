import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth.service';
import { prefersReducedMotion } from '../../shared/motion';
import { ToastComponent } from '../../shared/toast/toast.component';
import { HeaderComponent } from '../header/header.component';
import { SignInComponent } from '../sign-in/sign-in.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    SignInComponent,
    ToastComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly reduceMotion = prefersReducedMotion();

  ngOnInit() {
    // Only the bare root needs a destination; deep links and reloads stay put.
    if (this.authService.isLoggedIn() && window.location.pathname === '/') {
      this.router.navigate(['/adopt-family']);
    }
  }
}
