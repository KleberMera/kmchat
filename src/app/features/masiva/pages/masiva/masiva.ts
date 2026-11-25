import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormField, form, min, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { SESSION_STATUS } from '../../../../shared/constants/status.constants';
import type { ApiResponse } from '../../../../shared/models/api-response';
import { StorageServices } from '../../../../shared/services/storage-services';
import type { UserSession } from '../../../sesiones/models/session.model';
import { SesionesServices } from '../../../sesiones/services/sesiones-services';
import { BulkService } from '../../services/bulk.service';
import type {
  BulkBatchDetail,
  BulkBatchStatus,
  BulkBatchSummary,
  BulkMessageLog,
  BulkRecipient,
  BulkStartRequest,
  BulkStartResponse,
} from '../../models/bulk.model';

@Component({
  imports: [FormField],
  selector: 'app-masiva',
  templateUrl: './masiva.html',
})
export class Masiva {
  private readonly storage = inject(StorageServices);
  private readonly sessionsService = inject(SesionesServices);
  private readonly bulkService = inject(BulkService);
  private readonly swal = Swal.mixin({ theme: 'dark' });

  readonly userId = signal(this.storage.getUser()?.id ?? null);
  readonly sessionsResource = this.sessionsService.getUserSessions(this.userId);
  readonly readySessions = computed(() =>
    this.sessionsResource.hasValue()
      ? this.sessionsResource
          .value()
          .data.filter(
            (session) =>
              session.isActive && session.status === SESSION_STATUS.READY,
          )
      : [],
  );
  readonly sessionsError = computed(() => {
    if (!this.userId()) {
      return 'No se encontró el usuario autenticado.';
    }

    const error = this.sessionsResource.error();
    return error
      ? this.getErrorMessage(error, 'No se pudieron cargar las sesiones.')
      : null;
  });
  readonly selectedSessionIds = signal<string[]>([]);
  readonly recipients = signal<BulkRecipient[]>([]);
  readonly recipientFileName = signal<string | null>(null);
  readonly recipientFileError = signal<string | null>(null);
  readonly isReadingFile = signal(false);
  readonly recipientHeaders = computed(() =>
    this.recipients().length ? Object.keys(this.recipients()[0]) : [],
  );
  readonly previewHeaders = computed(() =>
    this.recipientHeaders().slice(0, 5),
  );
  readonly previewRecipients = computed(() => this.recipients().slice(0, 5));

  readonly campaignModel = signal({
    message: '',
    delayBetweenMessagesMs: 1000,
    batchSize: 50,
    longPauseMs: 30000,
    verifyDelayMs: 1000,
  });
  readonly campaignForm = form(this.campaignModel, (path) => {
    required(path.message, { message: 'El mensaje es obligatorio.' });
    min(path.delayBetweenMessagesMs, 0, {
      message: 'La pausa entre mensajes no puede ser negativa.',
    });
    min(path.batchSize, 1, {
      message: 'El tamaño del lote debe ser al menos 1.',
    });
    min(path.longPauseMs, 0, {
      message: 'La pausa larga no puede ser negativa.',
    });
    min(path.verifyDelayMs, 0, {
      message: 'La pausa de verificación no puede ser negativa.',
    });
  });
  readonly isStarting = signal(false);

  readonly historyPage = signal(1);
  readonly historyResource = this.bulkService.getHistory(this.historyPage);
  readonly history = computed(() =>
    this.historyResource.hasValue()
      ? this.historyResource.value().data
      : null,
  );
  readonly historyError = computed(() => {
    const error = this.historyResource.error();
    return error
      ? this.getErrorMessage(error, 'No se pudo cargar el historial.')
      : null;
  });

  readonly selectedBatchId = signal<string | null>(null);
  readonly statusResource = this.bulkService.getStatus(this.selectedBatchId);
  readonly detailResource = this.bulkService.getBatch(this.selectedBatchId);
  readonly logStatusFilter = signal<string | null>(null);
  readonly logsPage = signal(1);
  readonly logsResource = this.bulkService.getLogs(
    this.selectedBatchId,
    this.logStatusFilter,
    this.logsPage,
  );
  readonly batchStatus = computed<BulkBatchStatus | null>(() =>
    this.statusResource.hasValue()
      ? this.statusResource.value().data
      : null,
  );
  readonly batchDetail = computed<BulkBatchDetail | null>(() =>
    this.detailResource.hasValue()
      ? this.detailResource.value().data
      : null,
  );
  readonly logs = computed<BulkMessageLog[]>(() =>
    this.logsResource.hasValue()
      ? this.logsResource.value().data.items
      : [],
  );
  readonly logsPagination = computed(() =>
    this.logsResource.hasValue()
      ? this.logsResource.value().data.pagination
      : null,
  );
  readonly statusError = computed(() => {
    const error = this.statusResource.error();
    return error
      ? this.getErrorMessage(error, 'No se pudo consultar el progreso.')
      : null;
  });
  readonly detailError = computed(() => {
    const error = this.detailResource.error();
    return error
      ? this.getErrorMessage(error, 'No se pudo cargar el detalle del lote.')
      : null;
  });
  readonly logsError = computed(() => {
    const error = this.logsResource.error();
    return error
      ? this.getErrorMessage(error, 'No se pudieron cargar los registros.')
      : null;
  });
  readonly isPolling = signal(false);

  private readonly pollingEffect = effect((onCleanup) => {
    if (!this.selectedBatchId() || !this.isPolling()) {
      return;
    }

    const intervalId = setInterval(() => {
      if (!this.statusResource.isLoading()) {
        this.statusResource.reload();
      }
    }, 3000);
    onCleanup(() => clearInterval(intervalId));
  });

  private readonly stopPollingEffect = effect(() => {
    const status = this.batchStatus();
    if (
      this.isPolling() &&
      status?.id === this.selectedBatchId() &&
      status &&
      this.isTerminalStatus(status.status)
    ) {
      this.isPolling.set(false);
      this.historyResource.reload();
    }
  });

  async loadRecipients(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.isReadingFile.set(true);
    this.recipientFileError.set(null);

    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('El archivo no contiene hojas de cálculo.');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        { blankrows: false, defval: '', raw: false },
      );
      if (rows.length === 0) {
        throw new Error('La primera hoja no contiene destinatarios.');
      }

      const phoneHeader = Object.keys(rows[0]).find(
        (header) => header.trim().toLowerCase() === 'phone',
      );
      if (!phoneHeader) {
        throw new Error('El Excel debe incluir una columna llamada "phone".');
      }

      const importedRecipients = rows
        .map((row) => {
          const recipient: BulkRecipient = { phone: '' };
          for (const [header, value] of Object.entries(row)) {
            const trimmedHeader = header.trim();
            if (!trimmedHeader || trimmedHeader.startsWith('__EMPTY')) {
              continue;
            }

            const field =
              trimmedHeader.toLowerCase() === 'phone'
                ? 'phone'
                : trimmedHeader;
            recipient[field] = this.toCellString(value);
          }

          return recipient;
        })
        .filter((recipient) => recipient.phone.trim().length > 0);

      if (importedRecipients.length === 0) {
        throw new Error('El Excel no contiene teléfonos válidos.');
      }

      this.recipients.set(importedRecipients);
      this.recipientFileName.set(file.name);
    } catch (error: unknown) {
      this.recipients.set([]);
      this.recipientFileName.set(null);
      this.recipientFileError.set(
        this.getErrorMessage(error, 'No se pudo leer el archivo Excel.'),
      );
    } finally {
      this.isReadingFile.set(false);
      input.value = '';
    }
  }

  clearRecipients(): void {
    this.recipients.set([]);
    this.recipientFileName.set(null);
    this.recipientFileError.set(null);
  }

  toggleSessionSelection(sessionId: string, event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.selectedSessionIds.update((selected) =>
      input.checked
        ? [...new Set([...selected, sessionId])]
        : selected.filter((id) => id !== sessionId),
    );
  }

  async startBulk(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isStarting()) {
      return;
    }

    if (this.selectedSessionIds().length === 0) {
      await this.showError('Selecciona al menos una sesión conectada.');
      return;
    }
    if (this.recipients().length === 0) {
      await this.showError('Carga un archivo Excel con destinatarios.');
      return;
    }

    await submit(this.campaignForm, async () => {
      this.isStarting.set(true);
      const model = this.campaignModel();
      const request: BulkStartRequest = {
        ...model,
        sessionIds: this.selectedSessionIds(),
        recipients: this.recipients(),
      };

      let response: ApiResponse<BulkStartResponse>;
      try {
        response = await firstValueFrom(this.bulkService.start(request));
      } catch (error: unknown) {
        this.isStarting.set(false);
        await this.showError(
          this.getErrorMessage(error, 'No se pudo iniciar el envío masivo.'),
        );
        return;
      }

      this.isStarting.set(false);
      this.selectedBatchId.set(response.data.batchId);
      this.logStatusFilter.set(null);
      this.logsPage.set(1);
      this.isPolling.set(!this.isTerminalStatus(response.data.status));
      if (this.historyPage() === 1) {
        this.historyResource.reload();
      } else {
        this.historyPage.set(1);
      }

      await this.swal.fire({
        icon: 'success',
        title: 'Envío iniciado',
        text:
          response.data.message ??
          response.message ??
          'El lote comenzó a procesarse.',
        confirmButtonText: 'Ver progreso',
      });
    });
  }

  selectBatch(batch: BulkBatchSummary): void {
    this.selectedBatchId.set(batch.id);
    this.logStatusFilter.set(null);
    this.logsPage.set(1);
    this.isPolling.set(!this.isTerminalStatus(batch.status));
  }

  changeHistoryPage(delta: number): void {
    const page = this.history()?.pagination;
    if (!page) {
      return;
    }

    this.historyPage.update((current) =>
      Math.min(page.totalPages, Math.max(1, current + delta)),
    );
  }

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

  getBulkStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'PROCESSING':
        return 'En proceso';
      case 'COMPLETED':
        return 'Completado';
      case 'FAILED':
        return 'Fallido';
      case 'SENT':
        return 'Enviado';
      case 'INVALID':
        return 'Inválido';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  getBulkStatusClasses(status: string): string {
    const baseClasses =
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold';

    switch (status) {
      case 'PENDING':
        return `${baseClasses} bg-amber-500/10 text-amber-700 dark:text-amber-300`;
      case 'PROCESSING':
        return `${baseClasses} bg-blue-500/10 text-blue-700 dark:text-blue-300`;
      case 'COMPLETED':
        return `${baseClasses} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`;
      case 'SENT':
        return `${baseClasses} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`;
      case 'FAILED':
        return `${baseClasses} bg-red-500/10 text-red-700 dark:text-red-300`;
      case 'INVALID':
        return `${baseClasses} bg-amber-500/10 text-amber-700 dark:text-amber-300`;
      default:
        return `${baseClasses} bg-surface-200 text-color-secondary dark:bg-surface-700`;
    }
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  private isTerminalStatus(status: string): boolean {
    return status === 'COMPLETED' || status === 'FAILED';
  }

  private toCellString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value).trim();
  }

  private async showError(message: string): Promise<void> {
    await this.swal.fire({
      icon: 'error',
      title: 'No se pudo completar la operación',
      text: message,
      confirmButtonText: 'Aceptar',
    });
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body: unknown = error.error;
      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof body.message === 'string'
      ) {
        return body.message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }
}
