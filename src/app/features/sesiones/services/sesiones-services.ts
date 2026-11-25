import {
  HttpClient,
  httpResource,
  type HttpResourceRef,
} from '@angular/common/http';
import { inject, Service, type Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../../shared/models/api-response';
import type {
  CreateSessionRequest,
  SessionQrData,
  UserSession,
} from '../models/session.model';

@Service()
export class SesionesServices {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/sessions`;

  getUserSessions(
    userId: Signal<string | null>,
  ): HttpResourceRef<ApiResponse<UserSession[]> | undefined> {
    return httpResource<ApiResponse<UserSession[]>>(() => {
      const currentUserId = userId();
      return currentUserId
        ? `${this.apiUrl}/user/${encodeURIComponent(currentUserId)}`
        : undefined;
    });
  }

  getSessionQr(
    sessionId: Signal<string | null>,
  ): HttpResourceRef<ApiResponse<SessionQrData> | undefined> {
    return httpResource<ApiResponse<SessionQrData>>(() => {
      const currentSessionId = sessionId();
      return currentSessionId
        ? `${this.apiUrl}/${encodeURIComponent(currentSessionId)}/qr`
        : undefined;
    });
  }

  createSession(
    request: CreateSessionRequest,
  ): Observable<ApiResponse<UserSession>> {
    return this.http.post<ApiResponse<UserSession>>(this.apiUrl, request);
  }

  restartSession(sessionId: string): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(
      `${this.apiUrl}/${encodeURIComponent(sessionId)}/restart`,
      null,
    );
  }

  deleteSession(sessionId: string): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.apiUrl}/${encodeURIComponent(sessionId)}`,
    );
  }
}
