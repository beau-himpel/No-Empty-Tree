import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { prefersReducedMotion } from './shared/motion';
import { AppTitleStrategy } from './title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true })),
    // Reduced-motion users get the no-op engine: list/expand animations complete instantly
    provideAnimationsAsync(prefersReducedMotion() ? 'noop' : 'animations'),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ]
};
