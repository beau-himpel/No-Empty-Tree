import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth.service';
import { NominationSettingsService } from '../../nomination-settings.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly nominationSettingsService = inject(
    NominationSettingsService
  );

  readonly nominationsEnabled =
    this.nominationSettingsService.nominationsEnabled;

  async logout(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}
