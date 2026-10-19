import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    children: [
      {
        path: 'adopt-family',
        canActivate: [authGuard],
        loadComponent: () => import('./components/adopt-family/adopt-family.component').then(m => m.AdoptFamilyComponent)
      },
      {
        // Always routed; the page itself shows "closed" unless nomination_settings enables it
        path: 'nominate-family',
        canActivate: [authGuard],
        loadComponent: () => import('./components/nominate-family/nominate-family.component').then(m => m.NominateFamilyComponent)
      },
      {
        path: 'my-adoptions',
        canActivate: [authGuard],
        loadComponent: () => import('./components/my-adoptions/my-adoptions.component').then(m => m.MyAdoptionsComponent)
      },
    ]
  },
  { path: '**', redirectTo: 'adopt-family' }
];
