import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageServices } from '../../../shared/services/storage-services';

export const authGuard: CanActivateFn = () => {
  const storage = inject(StorageServices);
  const router = inject(Router);

  return storage.getUser() ? true : router.createUrlTree(['/login']);
};
