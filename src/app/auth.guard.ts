import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // On a page reload the stored session is restored asynchronously; deciding before
  // it lands would bounce signed-in users to the landing page.
  await authService.whenReady();

  return authService.isLoggedIn() ? true : router.createUrlTree(['']);
};
