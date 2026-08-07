import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';

// Brand PrimeNG (dialogs, spinner, toast) with the same pine palette used in Tailwind
const NoEmptyTreePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f2f7f4',
      100: '#dfece4',
      200: '#c1d9cc',
      300: '#98bfaa',
      400: '#6ca085',
      500: '#4b8367',
      600: '#376852',
      700: '#2c5443',
      800: '#254437',
      900: '#1f382e',
      950: '#101f19',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: NoEmptyTreePreset }
    }),
  ]
};
