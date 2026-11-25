import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  formatEcuadorianPhone,
  formatEcuadorianPhoneForExport,
} from '../../../../shared/utils/phone.utils';
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
  readonly logsPageSize = 50;
  readonly logsResource = this.bulkService.getLogs(this.batchId);
  readonly batchStatus = computed<BulkBatchStatus | null>(() =>
    this.statusResource.hasValue() ? this.statusResource.value().data : null,
  );
  readonly batchDetail = computed<BulkBatchDetail | null>(() =>
    this.detailResource.hasValue() ? this.detailResource.value().data : null,
  );
  readonly allLogs = computed<BulkMessageLog[]>(() =>
    this.logsResource.hasValue() ? this.logsResource.value().data.items : [],
  );
  readonly filteredLogs = computed(() => {
    const status = this.logStatusFilter();
    return status ? this.allLogs().filter((log) => log.status === status) : this.allLogs();
  });
  readonly logs = computed(() => {
    const start = (this.logsPage() - 1) * this.logsPageSize;
    return this.filteredLogs().slice(start, start + this.logsPageSize);
  });
  readonly logsPagination = computed(() => ({
    page: this.logsPage(),
    total: this.filteredLogs().length,
    totalPages: Math.max(1, Math.ceil(this.filteredLogs().length / this.logsPageSize)),
  }));
  readonly isExporting = signal(false);
  readonly exportError = signal<string | null>(null);
  readonly exportEnabled = computed(
    () => this.logsResource.hasValue() && !this.isExporting(),
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

  async exportBatchExcel(): Promise<void> {
    if (!this.logsResource.hasValue() || this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    this.exportError.set(null);

    try {
      const XLSX = await import('xlsx');
      const detail = this.batchDetail();
      const status = this.batchStatus();
      const config = detail?.config;
      const detailsSheet = XLSX.utils.aoa_to_sheet([
        ['Detalle del lote', ''],
        ['ID del lote', this.batchId() ?? ''],
        ['Estado', status ? this.getBulkStatusLabel(status.status) : ''],
        ['Estado del lote (API)', status?.status ?? detail?.status ?? ''],
        ['Progreso (%)', status?.progress ?? detail?.progress ?? ''],
        ['Total de destinatarios', status?.total ?? detail?.total ?? config?.recipients.length ?? 0],
        ['Procesados', status?.processed ?? detail?.processed ?? 0],
        ['Enviados', status?.sent ?? detail?.sent ?? 0],
        ['Fallidos', status?.failed ?? detail?.failed ?? 0],
        ['Inválidos', status?.invalid ?? detail?.invalid ?? 0],
        ['Sesión actual', status?.currentSessionId ?? detail?.currentSessionId ?? ''],
        ['Sesiones seleccionadas', config?.sessionIds.length ?? 0],
        ['IDs de sesiones', config?.sessionIds.join(', ') ?? ''],
        ['Destinatarios configurados', config?.recipients.length ?? 0],
        ['Mensaje', config?.message ?? ''],
        [
          'Pausa entre mensajes (ms)',
          config?.delayBetweenMessagesMs ?? '',
        ],
        ['Tamaño del lote', config?.batchSize ?? ''],
        ['Pausa larga (ms)', config?.longPauseMs ?? ''],
        ['Pausa entre verificaciones (ms)', config?.verifyDelayMs ?? ''],
        ['Creado', detail ? this.formatDate(detail.createdAt) : ''],
      ]);
      const logsSheet = XLSX.utils.json_to_sheet(
        this.allLogs().map((log) => ({
          'ID del registro': log.id,
          'ID del lote': log.batchId,
          Teléfono: formatEcuadorianPhoneForExport(log.phoneNumber),
          'ID de sesión': log.sessionId,
          'Teléfono de sesión': formatEcuadorianPhoneForExport(log.sessionPhoneNumber),
          Estado: this.getBulkStatusLabel(log.status),
          'Estado (API)': log.status,
          Error: log.errorMessage ?? '',
          'Fecha de envío': this.formatDate(log.sentAt),
        })),
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Detalles');
      XLSX.utils.book_append_sheet(workbook, logsSheet, 'Log completo');
      XLSX.writeFile(workbook, `lote-${this.batchId() ?? 'envio'}.xlsx`);
    } catch (error: unknown) {
      this.exportError.set(
        getBulkErrorMessage(error, 'No se pudo exportar el archivo Excel.'),
      );
    } finally {
      this.isExporting.set(false);
    }
  }

  private isTerminalStatus(status: string): boolean {
    return status === 'COMPLETED' || status === 'FAILED';
  }
}
