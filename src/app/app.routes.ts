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
        title: 'Adopt families',
        loadComponent: () => import('./components/adopt-family/adopt-family.component').then(m => m.AdoptFamilyComponent)
      },
      {
        // Always routed; the page itself shows "closed" unless nomination_settings enables it
        path: 'nominate-family',
        canActivate: [authGuard],
        title: 'Nominate a family',
        loadComponent: () => import('./components/nominate-family/nominate-family.component').then(m => m.NominateFamilyComponent)
      },
      {
        path: 'reset-password',
        canActivate: [authGuard],
        title: 'Reset password',
        loadComponent: () => import('./components/auth/reset-password.component').then(m => m.ResetPasswordComponent)
      },
      {
        path: 'my-adoptions',
        canActivate: [authGuard],
        title: 'My adoptions',
        loadComponent: () => import('./components/my-adoptions/my-adoptions.component').then(m => m.MyAdoptionsComponent)
      },
      {
        path: 'my-adoptions/shopping-list',
        canActivate: [authGuard],
        title: 'Shopping list',
        loadComponent: () => import('./components/shopping-list/shopping-list.component').then(m => m.ShoppingListComponent)
      },
    ]
  },
  { path: '**', redirectTo: 'adopt-family' }
];
