import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then((module) => module.Login),
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/layout/layout').then((module) => module.Layout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/resumen/pages/resumen/resumen').then(
            (module) => module.Resumen,
          ),
      },
      {
        path: 'sesiones',
        loadComponent: () =>
          import('./features/sesiones/pages/sesiones/sesiones').then(
            (module) => module.Sesiones,
          ),
      },
    ],
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
