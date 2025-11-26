import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth.service';
import { HeaderComponent } from '../header/header.component';
import { SignInComponent } from '../sign-in/sign-in.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    SignInComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/my-adoptions']);
    }
  }
}