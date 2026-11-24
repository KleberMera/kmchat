import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
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

  getUserSessions(userId: string): Observable<ApiResponse<UserSession[]>> {
    return this.http.get<ApiResponse<UserSession[]>>(
      `${this.apiUrl}/user/${encodeURIComponent(userId)}`,
    );
  }

  createSession(
    request: CreateSessionRequest,
  ): Observable<ApiResponse<UserSession>> {
    return this.http.post<ApiResponse<UserSession>>(this.apiUrl, request);
  }

  getSessionQr(sessionId: string): Observable<ApiResponse<SessionQrData>> {
    return this.http.get<ApiResponse<SessionQrData>>(
      `${this.apiUrl}/${encodeURIComponent(sessionId)}/qr`,
    );
  }

  restartSession(sessionId: string): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(
      `${this.apiUrl}/${encodeURIComponent(sessionId)}/restart`,
      null,
    );
  }
}
