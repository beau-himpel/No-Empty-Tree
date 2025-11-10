import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    children: [
      { 
        path: '', 
        loadComponent: () => import('./components/my-adoptions/my-adoptions.component').then(m => m.MyAdoptionsComponent) 
      },
      { 
        path: 'adopt-family', 
        loadComponent: () => import('./components/adopt-family/adopt-family.component').then(m => m.AdoptFamilyComponent) 
      },
      // { 
      //   path: 'nominate-family', 
      //   loadComponent: () => import('./components/nominate-family/nominate-family.component').then(m => m.NominateFamilyComponent) 
      // },
      { 
        path: 'my-adoptions', 
        loadComponent: () => import('./components/my-adoptions/my-adoptions.component').then(m => m.MyAdoptionsComponent) 
      },
      { 
        path: 'sign-in', 
        loadComponent: () => import('./components/sign-in/sign-in.component').then(m => m.SignInComponent) 
      },
      { 
        path: 'sign-up', 
        loadComponent: () => import('./components/sign-up/sign-up.component').then(m => m.SignUpComponent) 
      }
    ]
  },
  { 
    path: 'auth/callback', 
    loadComponent: () => import('./components/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent) 
  },
  { path: '**', redirectTo: '' }
];
