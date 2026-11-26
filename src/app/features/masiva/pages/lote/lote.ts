import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
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
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule, type Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type { TagSeverity } from 'primeng/types/tag';
import { Search } from '@primeicons/angular/search';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';

import { ArrowLeft } from '@primeicons/angular/arrow-left';
import { FileExcel } from '@primeicons/angular/file-excel';
import { InfoCircle } from '@primeicons/angular/info-circle';
import { ExclamationCircle } from '@primeicons/angular/exclamation-circle';
import { Inbox } from '@primeicons/angular/inbox';

// agrega a imports: [ButtonModule, MessageModule, SkeletonModule, ProgressBarModule,
//   ArrowLeft, FileExcel, InfoCircle, ExclamationCircle, Inbox, ...los que ya tienes]
type BulkMessageLogTableRow = BulkMessageLog & {
  phoneSearch: string;
  sessionPhoneSearch: string;
};

@Component({
  imports: [
    RouterLink,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    Search,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    ProgressBarModule,
    ArrowLeft,
    FileExcel,
    Inbox,
  ],
  selector: 'app-lote',
  templateUrl: './lote.html',
})
export class Lote {
  private readonly route = inject(ActivatedRoute);
  private readonly bulkService = inject(BulkService);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly router = inject(Router);
  private readonly swal = Swal.mixin({ theme: 'dark' });

  readonly batchId = computed(() => this.routeParams().get('batchId'));
  readonly statusResource = this.bulkService.getStatus(this.batchId);
  readonly detailResource = this.bulkService.getBatch(this.batchId);
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
  readonly tableLogs = computed<BulkMessageLogTableRow[]>(() =>
    this.allLogs().map((log) => ({
      ...log,
      phoneSearch: [
        log.phoneNumber,
        formatEcuadorianPhone(log.phoneNumber),
        formatEcuadorianPhoneForExport(log.phoneNumber),
      ].join(' '),
      sessionPhoneSearch: [
        log.sessionPhoneNumber ?? '',
        formatEcuadorianPhone(log.sessionPhoneNumber),
        formatEcuadorianPhoneForExport(log.sessionPhoneNumber),
      ].join(' '),
    })),
  );
  readonly logGlobalFilterFields = [
    'phoneSearch',
    'sessionName',
    'sessionId',
    'sessionPhoneSearch',
    'status',
    'errorMessage',
    'sentAt',
  ];
  readonly logStatusOptions = [
    { label: 'Enviados', value: 'SENT' },
    { label: 'Fallidos', value: 'FAILED' },
    { label: 'Inválidos', value: 'INVALID' },
    { label: 'Pendientes', value: 'PENDING' },
    { label: 'En proceso', value: 'PROCESSING' },
    { label: 'Completados', value: 'COMPLETED' },
    { label: 'Cancelados', value: 'CANCELLED' },
  ];
  readonly isExporting = signal(false);
  readonly isOperating = signal(false);
  readonly actionError = signal<string | null>(null);
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
  readonly canPause = computed(() =>
    ['PENDING', 'PROCESSING'].includes(this.batchStatus()?.status ?? ''),
  );

  private readonly pollingEffect = effect((onCleanup) => {
    if (!this.batchId() || !this.isPolling()) {
      return;
    }

    const intervalId = setInterval(() => {
      if (!this.statusResource.isLoading()) {
        this.statusResource.reload();
      }
      if (!this.logsResource.isLoading()) {
        this.logsResource.reload();
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

  filterLogs(table: Table<BulkMessageLogTableRow>, event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    table.filterGlobal(input.value, 'contains');
  }

  async pauseBatch(): Promise<void> {
    const batchId = this.batchId();
    if (!batchId) return;
    await this.performAction(
      '¿Pausar este lote?',
      'El envío se detendrá después del mensaje que esté procesándose.',
      () => this.bulkService.pause(batchId),
    );
  }

  async restartBatch(): Promise<void> {
    const batchId = this.batchId();
    if (!batchId) return;
    await this.performAction(
      '¿Reiniciar este lote?',
      'Se borrarán los registros actuales y el envío comenzará desde el primer contacto.',
      () => this.bulkService.restart(batchId),
    );
  }

  async deleteBatch(): Promise<void> {
    const confirmed = await this.swal.fire({
      icon: 'warning',
      title: '¿Eliminar este lote?',
      text: 'Se eliminarán el lote y todos sus registros. Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      reverseButtons: true,
      focusCancel: true,
    });
    const batchId = this.batchId();
    if (!confirmed.isConfirmed || !batchId) return;

    this.isOperating.set(true);
    this.actionError.set(null);
    try {
      await firstValueFrom(this.bulkService.remove(batchId));
      await this.router.navigate(['/lotes']);
    } catch (error: unknown) {
      this.actionError.set(
        getBulkErrorMessage(error, 'No se pudo eliminar el lote.'),
      );
    } finally {
      this.isOperating.set(false);
    }
  }

  private async performAction(
    title: string,
    text: string,
    action: () => ReturnType<BulkService['pause']>,
  ): Promise<void> {
    if (this.isOperating()) return;
    const confirmed = await this.swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
    });
    if (!confirmed.isConfirmed) return;

    this.isOperating.set(true);
    this.actionError.set(null);
    try {
      await firstValueFrom(action());
      await Promise.all([
        this.statusResource.reload(),
        this.detailResource.reload(),
        this.logsResource.reload(),
      ]);
    } catch (error: unknown) {
      this.actionError.set(
        getBulkErrorMessage(error, 'No se pudo actualizar el lote.'),
      );
    } finally {
      this.isOperating.set(false);
    }
  }

  filterColumn(event: Event, callback: (value: string) => void): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    callback(input.value);
  }

  getLogSeverity(status: string): TagSeverity {
    switch (status) {
      case 'COMPLETED':
      case 'SENT':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'INVALID':
        return 'warn';
      case 'PROCESSING':
        return 'info';
      default:
        return 'secondary';
    }
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
        [
          'Verificación de números',
          config?.verifyNumbers === false ? 'Desactivada' : 'Activada',
        ],
        ['Video adjunto', detail?.videoFileName ?? 'No'],
        ['Creado', detail ? this.formatDate(detail.createdAt) : ''],
      ]);
      const logsSheet = XLSX.utils.json_to_sheet(
        this.allLogs().map((log) => ({
          'ID del registro': log.id,
          'ID del lote': log.batchId,
          Teléfono: formatEcuadorianPhoneForExport(log.phoneNumber),
          'ID de sesión': log.sessionId,
          'Nombre de sesión': log.sessionName ?? '',
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
    return status === 'COMPLETED' || status === 'FAILED' || status === 'PAUSED';
  }
}
