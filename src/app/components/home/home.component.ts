import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../auth.service';
import { SignInComponent } from '../sign-in/sign-in.component';
import { HeaderComponent } from '../header/header.component';
import { MyAdoptionsComponent } from '../my-adoptions/my-adoptions.component';
import { AdoptFamilyComponent } from '../adopt-family/adopt-family.component';
import { NominateFamilyComponent } from '../nominate-family/nominate-family.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    SignInComponent,
    HeaderComponent,
    MyAdoptionsComponent,
    AdoptFamilyComponent,
    NominateFamilyComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  currentView = signal<'my-adoptions' | 'adopt-family' | 'nominate-family'>('my-adoptions');
  
  isLoggedIn = this.authService.isLoggedIn;
  
  ngOnInit() {
    // Set initial view based on current route
    this.updateCurrentView(this.router.url);
    
    // Listen for navigation events
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateCurrentView(event.url);
      });
  }
  
  private updateCurrentView(url: string) {
    if (url.includes('/adopt-family')) {
      this.currentView.set('adopt-family');
    } else if (url.includes('/nominate-family')) {
      this.currentView.set('nominate-family');
    } else {
      this.currentView.set('my-adoptions');
    }
  }
}
