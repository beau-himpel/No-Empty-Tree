import { Routes } from '@angular/router';
import { SignInComponent } from './components/sign-in/sign-in.component';
import { LandingComponent } from './components/landing/landing.component';
import { NominateFamilyComponent } from './components/nominate-family/nominate-family.component';
import { AdoptFamilyComponent } from './components/adopt-family/adopt-family.component';
import { MyAdoptionsComponent } from './components/my-adoptions/my-adoptions.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'sign-in', component: SignInComponent },
  { path: 'landing', component: LandingComponent },
  { path: 'nominate-family', component: NominateFamilyComponent },
  { path: 'adopt-family', component: AdoptFamilyComponent },
  { path: 'my-adoptions', component: MyAdoptionsComponent },
];
