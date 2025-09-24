import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'landing', loadComponent: () => import('./components/landing/landing.component').then(m => m.LandingComponent) },
  { path: 'sign-in', loadComponent: () => import('./components/sign-in/sign-in.component').then(m => m.SignInComponent) },
  { path: 'nominate-family', loadComponent: () => import('./components/nominate-family/nominate-family.component').then(m => m.NominateFamilyComponent), canActivate: [authGuard] },
  { path: 'adopt-family', loadComponent: () => import('./components/adopt-family/adopt-family.component').then(m => m.AdoptFamilyComponent), canActivate: [authGuard] },
  { path: 'my-adoptions', loadComponent: () => import('./components/my-adoptions/my-adoptions.component').then(m => m.MyAdoptionsComponent), canActivate: [authGuard] },
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: '**', redirectTo: '/landing' }
];
