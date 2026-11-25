import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatEcuadorianPhone } from '../../../../shared/utils/phone.utils';
import { BulkService } from '../../services/bulk.service';
import {
  formatBulkDate,
  getBulkErrorMessage,
  getBulkStatusClasses,
  getBulkStatusLabel,
} from '../../utils/bulk.utils';
import type {
  BulkBatchDetail,
  BulkBatchStatus,
  BulkMessageLog,
} from '../../models/bulk.model';

@Component({
  imports: [RouterLink],
  selector: 'app-lote',
  templateUrl: './lote.html',
})
export class Lote {
  private readonly route = inject(ActivatedRoute);
  private readonly bulkService = inject(BulkService);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly batchId = computed(() => this.routeParams().get('batchId'));
  readonly statusResource = this.bulkService.getStatus(this.batchId);
  readonly detailResource = this.bulkService.getBatch(this.batchId);
  readonly logStatusFilter = signal<string | null>(null);
  readonly logsPage = signal(1);
  readonly logsResource = this.bulkService.getLogs(
    this.batchId,
    this.logStatusFilter,
    this.logsPage,
  );
  readonly batchStatus = computed<BulkBatchStatus | null>(() =>
    this.statusResource.hasValue() ? this.statusResource.value().data : null,
  );
  readonly batchDetail = computed<BulkBatchDetail | null>(() =>
    this.detailResource.hasValue() ? this.detailResource.value().data : null,
  );
  readonly logs = computed<BulkMessageLog[]>(() =>
    this.logsResource.hasValue() ? this.logsResource.value().data.items : [],
  );
  readonly logsPagination = computed(() =>
    this.logsResource.hasValue()
      ? this.logsResource.value().data.pagination
      : null,
  );
  readonly statusError = computed(() => {
    const error = this.statusResource.error();
    return error
      ? getBulkErrorMessage(error, 'No se pudo consultar el progreso.')
      : null;
  });
  readonly detailError = computed(() => {
    const error = this.detailResource.error();
    return error
      ? getBulkErrorMessage(error, 'No se pudo cargar el detalle del lote.')
      : null;
  });
  readonly logsError = computed(() => {
    const error = this.logsResource.error();
    return error
      ? getBulkErrorMessage(error, 'No se pudieron cargar los registros.')
      : null;
  });
  readonly isPolling = signal(true);
  readonly getBulkStatusClasses = getBulkStatusClasses;
  readonly getBulkStatusLabel = getBulkStatusLabel;
  readonly formatDate = formatBulkDate;
  readonly formatPhone = formatEcuadorianPhone;

  private readonly pollingEffect = effect((onCleanup) => {
    if (!this.batchId() || !this.isPolling()) {
      return;
    }

    const intervalId = setInterval(() => {
      if (!this.statusResource.isLoading()) {
        this.statusResource.reload();
      }
    }, 3000);
    onCleanup(() => clearInterval(intervalId));
  });

  private readonly syncPollingEffect = effect(() => {
    const status = this.batchStatus();
    if (status?.id === this.batchId()) {
      this.isPolling.set(!this.isTerminalStatus(status.status));
    }
  });

  changeLogsPage(delta: number): void {
    const pagination = this.logsPagination();
    if (!pagination) {
      return;
    }

    this.logsPage.update((current) =>
      Math.min(pagination.totalPages, Math.max(1, current + delta)),
    );
  }

  changeLogStatus(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    this.logStatusFilter.set(select.value || null);
    this.logsPage.set(1);
  }

  private isTerminalStatus(status: string): boolean {
    return status === 'COMPLETED' || status === 'FAILED';
  }
}
