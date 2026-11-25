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
  BulkBatchDetail,
  BulkBatchStatus,
  BulkHistoryData,
  BulkLogsData,
  BulkStartRequest,
  BulkStartResponse,
} from '../models/bulk.model';

@Service()
export class BulkService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/bulk`;

  getHistory(
    page: Signal<number>,
    limit = 20,
  ): HttpResourceRef<ApiResponse<BulkHistoryData> | undefined> {
    return httpResource<ApiResponse<BulkHistoryData>>(
      () => `${this.apiUrl}?page=${page()}&limit=${limit}`,
    );
  }

  getStatus(
    batchId: Signal<string | null>,
  ): HttpResourceRef<ApiResponse<BulkBatchStatus> | undefined> {
    return httpResource<ApiResponse<BulkBatchStatus>>(() => {
      const currentBatchId = batchId();
      return currentBatchId
        ? `${this.apiUrl}/status/${encodeURIComponent(currentBatchId)}`
        : undefined;
    });
  }

  getBatch(
    batchId: Signal<string | null>,
  ): HttpResourceRef<ApiResponse<BulkBatchDetail> | undefined> {
    return httpResource<ApiResponse<BulkBatchDetail>>(() => {
      const currentBatchId = batchId();
      return currentBatchId
        ? `${this.apiUrl}/${encodeURIComponent(currentBatchId)}`
        : undefined;
    });
  }

  getLogs(
    batchId: Signal<string | null>,
    status: Signal<string | null>,
    page: Signal<number>,
    limit = 50,
  ): HttpResourceRef<ApiResponse<BulkLogsData> | undefined> {
    return httpResource<ApiResponse<BulkLogsData>>(() => {
      const currentBatchId = batchId();
      if (!currentBatchId) {
        return undefined;
      }

      const params = new URLSearchParams({
        page: String(page()),
        limit: String(limit),
      });
      const currentStatus = status();
      if (currentStatus) {
        params.set('status', currentStatus);
      }

      return `${this.apiUrl}/${encodeURIComponent(currentBatchId)}/logs?${params}`;
    });
  }

  start(request: BulkStartRequest): Observable<ApiResponse<BulkStartResponse>> {
    return this.http.post<ApiResponse<BulkStartResponse>>(
      `${this.apiUrl}/start`,
      request,
    );
  }
}
