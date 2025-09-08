import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'No-Empty-Tree';
  
  private readonly authService = inject(AuthService);
  
  // Expose auth state to template
  protected readonly isLoggedIn = this.authService.isLoggedIn;
  protected readonly currentUser = this.authService.currentUser;
}
