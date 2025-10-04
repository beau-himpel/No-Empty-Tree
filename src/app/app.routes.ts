import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'adopt-family', 
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'nominate-family', 
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'my-adoptions', 
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'sign-in', 
    loadComponent: () => import('./components/sign-in/sign-in.component').then(m => m.SignInComponent) 
  },
  { 
    path: 'sign-up', 
    loadComponent: () => import('./components/sign-up/sign-up.component').then(m => m.SignUpComponent) 
  },
  { path: '**', redirectTo: '' }
];
