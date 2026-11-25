import { Routes } from '@angular/router';
import { authGuard } from './features/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then((module) => module.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
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
      {
        path: 'masiva',
        loadComponent: () =>
          import('./features/masiva/pages/masiva/masiva').then(
            (module) => module.Masiva,
          ),
      },
      {
        path: 'lotes',
        loadComponent: () =>
          import('./features/masiva/pages/lotes/lotes').then(
            (module) => module.Lotes,
          ),
      },
      {
        path: 'lotes/:batchId',
        loadComponent: () =>
          import('./features/masiva/pages/lote/lote').then(
            (module) => module.Lote,
          ),
      },
      {
        path: 'masiva/lotes/:batchId',
        redirectTo: 'lotes/:batchId',
      },
      {
        path: 'masiva/lotes',
        redirectTo: 'lotes',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
