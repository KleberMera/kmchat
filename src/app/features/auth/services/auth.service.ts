import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, tap } from 'rxjs';
import type { ApiResponse } from '../../../shared/models/api-response';
import type { AuthenticatedUser } from '../../../shared/services/storage-services';
import { StorageServices } from '../../../shared/services/storage-services';
import { environment } from '../../../../environments/environment';

export interface LoginCredentials {
  username: string;
  password: string;
}

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageServices);
  protected readonly url = environment.apiUrl;
  login(credentials: LoginCredentials): Observable<ApiResponse<AuthenticatedUser>> {
    return this.http
      .post<ApiResponse<AuthenticatedUser>>(this.url, credentials)
      .pipe(tap((response) => this.storage.saveUser(response.data)));
  }
}
