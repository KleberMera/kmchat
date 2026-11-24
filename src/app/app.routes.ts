import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then((module) => module.Login),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./shared/layout/layout').then((module) => module.Layout),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
