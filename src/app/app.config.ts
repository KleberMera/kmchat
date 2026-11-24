import Aura from '@primeuix/themes/aura';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { definePreset } from '@primeuix/themes';

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{emerald.50}',
      100: '{emerald.100}',
      200: '{emerald.200}',
      300: '{emerald.300}',
      400: '{emerald.400}',
      500: '{emerald.500}',
      600: '{emerald.600}',
      700: '{emerald.700}',
      800: '{emerald.800}',
      900: '{emerald.900}',
      950: '{emerald.950}',
    },
    surface: {
      0: '#ffffff',
      50: 'light-dark({slate.50}, {slate.50})',
      100: 'light-dark({slate.100}, {slate.100})',
      200: 'light-dark({slate.200}, {slate.200})',
      300: 'light-dark({slate.300}, {slate.300})',
      400: 'light-dark({slate.400}, {slate.400})',
      500: 'light-dark({slate.500}, {slate.500})',
      600: 'light-dark({slate.600}, {slate.600})',
      700: 'light-dark({slate.700}, {slate.700})',
      800: 'light-dark({slate.800}, {slate.800})',
      900: 'light-dark({slate.900}, {slate.900})',
      950: 'light-dark({slate.950}, {slate.950})',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.my-app-dark',
        },
      },
      license:
        'eyJpZCI6IjkxMzEzNTQwLTczMTctNDBlMC1hYjgyLWRkYjc5NzdhMDk0OCIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODMwMDcxOTAsImV4cCI6MTgxNDU0MzE5MH0.PuvTny6EKM-c0PEF8M-fT15n28YCGMeczPFEHArEikuNR9-BTmzkYT9PmqWT04PqeyRPWSV-Bhcve6Tw-2d5AQ',
   
   
      }),
    // providePrimeNG({
    //   theme: {
    //     preset: MyPreset,
    //     options: {
    //       darkModeSelector: '.my-app-dark',
    //       // defaultScheme: 'light'
    //     },
    //   },
    //   license:
    //     'eyJpZCI6IjkxMzEzNTQwLTczMTctNDBlMC1hYjgyLWRkYjc5NzdhMDk0OCIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODMwMDcxOTAsImV4cCI6MTgxNDU0MzE5MH0.PuvTny6EKM-c0PEF8M-fT15n28YCGMeczPFEHArEikuNR9-BTmzkYT9PmqWT04PqeyRPWSV-Bhcve6Tw-2d5AQ',
    // }),
    // provideHttpClient(withInterceptors([roleValidationInterceptor])),
  ],
};
