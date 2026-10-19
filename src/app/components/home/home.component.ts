import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth.service';
import { ToastComponent } from '../../shared/toast/toast.component';
import { AuthPanelComponent } from '../auth/auth-panel.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    RouterOutlet,
    HeaderComponent,
    AuthPanelComponent,
    ToastComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly steps = [
    { title: 'Choose a family', body: "See who's in each family and what's on their wish lists." },
    { title: 'Adopt gifts', body: 'Claim one gift or a whole list. They’re saved in My Adoptions.' },
    { title: 'Shop and give', body: 'Buy the gifts you adopted so every tree has something under it.' },
  ];

  ngOnInit() {
    // Only the bare root needs a destination; deep links and reloads stay put.
    // Reset-password links are routed by AuthService instead.
    if (
      this.authService.isLoggedIn() &&
      !this.authService.isPasswordRecovery() &&
      window.location.pathname === '/'
    ) {
      this.router.navigate(['/adopt-family']);
    }
  }
}
