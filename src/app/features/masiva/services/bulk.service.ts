import {
  HttpClient,
  httpResource,
  type HttpResourceRef,
} from '@angular/common/http';
import { inject, Service, type Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../../shared/models/api-response';
import { StorageServices } from '../../../shared/services/storage-services';
import type {
  BulkBatchDetail,
  BulkBatchStatus,
  BulkActionResponse,
  BulkHistoryData,
  BulkLogsData,
  BulkStartRequest,
  BulkStartResponse,
} from '../models/bulk.model';

@Service()
export class BulkService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageServices);
  private readonly apiUrl = `${environment.apiUrl}/bulk`;

  getHistory(
    page: Signal<number>,
    limit = 20,
  ): HttpResourceRef<ApiResponse<BulkHistoryData> | undefined> {
    return httpResource<ApiResponse<BulkHistoryData>>(
      () => {
        const userQuery = this.getUserQuery();
        return userQuery
          ? `${this.apiUrl}?page=${page()}&limit=${limit}&${userQuery}`
          : undefined;
      },
    );
  }

  getStatus(
    batchId: Signal<string | null>,
  ): HttpResourceRef<ApiResponse<BulkBatchStatus> | undefined> {
    return httpResource<ApiResponse<BulkBatchStatus>>(() => {
      const currentBatchId = batchId();
      const userQuery = this.getUserQuery();
      return currentBatchId && userQuery
        ? `${this.apiUrl}/status/${encodeURIComponent(currentBatchId)}?${userQuery}`
        : undefined;
    });
  }

  getBatch(
    batchId: Signal<string | null>,
  ): HttpResourceRef<ApiResponse<BulkBatchDetail> | undefined> {
    return httpResource<ApiResponse<BulkBatchDetail>>(() => {
      const currentBatchId = batchId();
      const userQuery = this.getUserQuery();
      return currentBatchId && userQuery
        ? `${this.apiUrl}/${encodeURIComponent(currentBatchId)}?${userQuery}`
        : undefined;
    });
  }

  getLogs(
    batchId: Signal<string | null>,
  ): HttpResourceRef<ApiResponse<BulkLogsData> | undefined> {
    return httpResource<ApiResponse<BulkLogsData>>(() => {
      const currentBatchId = batchId();
      const userQuery = this.getUserQuery();
      return currentBatchId && userQuery
        ? `${this.apiUrl}/${encodeURIComponent(currentBatchId)}/logs?${userQuery}`
        : undefined;
    });
  }

  start(
    request: BulkStartRequest,
    video?: File | null,
  ): Observable<ApiResponse<BulkStartResponse>> {
    const url = `${this.apiUrl}/start?${this.requireUserQuery()}`;
    if (video) {
      const body = new FormData();
      body.append('config', JSON.stringify(request));
      body.append('video', video, video.name);
      return this.http.post<ApiResponse<BulkStartResponse>>(url, body);
    }

    return this.http.post<ApiResponse<BulkStartResponse>>(url, request);
  }

  pause(batchId: string): Observable<ApiResponse<BulkActionResponse>> {
    return this.http.post<ApiResponse<BulkActionResponse>>(
      `${this.apiUrl}/${encodeURIComponent(batchId)}/pause?${this.requireUserQuery()}`,
      {},
    );
  }

  restart(batchId: string): Observable<ApiResponse<BulkActionResponse>> {
    return this.http.post<ApiResponse<BulkActionResponse>>(
      `${this.apiUrl}/${encodeURIComponent(batchId)}/restart?${this.requireUserQuery()}`,
      {},
    );
  }

  remove(batchId: string): Observable<ApiResponse<BulkActionResponse>> {
    return this.http.delete<ApiResponse<BulkActionResponse>>(
      `${this.apiUrl}/${encodeURIComponent(batchId)}?${this.requireUserQuery()}`,
    );
  }

  private getUserQuery(): string | null {
    const userId = this.storage.getUser()?.id;
    return userId ? `userId=${encodeURIComponent(userId)}` : null;
  }

  private requireUserQuery(): string {
    const userQuery = this.getUserQuery();
    if (!userQuery) {
      throw new Error('No se encontró el usuario autenticado.');
    }
    return userQuery;
  }
}
