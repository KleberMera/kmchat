import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, min, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { SESSION_STATUS } from '../../../../shared/constants/status.constants';
import type { ApiResponse } from '../../../../shared/models/api-response';
import { StorageServices } from '../../../../shared/services/storage-services';
import { formatEcuadorianPhone } from '../../../../shared/utils/phone.utils';
import { SesionesServices } from '../../../sesiones/services/sesiones-services';
import type { BulkRecipient, BulkStartRequest, BulkStartResponse } from '../../models/bulk.model';
import { BulkService } from '../../services/bulk.service';
import {
  getBulkErrorMessage,
  minutesToMilliseconds,
  normalizeBulkRecipientHeader,
} from '../../utils/bulk.utils';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TableModule } from 'primeng/table';

import { Whatsapp } from '@primeicons/angular/whatsapp';
import { CheckCircle } from '@primeicons/angular/check-circle';
import { FileExcel } from '@primeicons/angular/file-excel';
import { Upload } from '@primeicons/angular/upload';
import { Times } from '@primeicons/angular/times';
import { Plus } from '@primeicons/angular/plus';
import { Check } from '@primeicons/angular/check';
import { User } from '@primeicons/angular/user';
import { Send } from '@primeicons/angular/send';
import { InfoCircle } from '@primeicons/angular/info-circle';
import { ExclamationCircle } from '@primeicons/angular/exclamation-circle';
import { Megaphone } from '@primeicons/angular/megaphone';

@Component({
  imports: [
    FormField,
    ButtonModule,
    TagModule,
    MessageModule,
    SkeletonModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    TableModule,
    Whatsapp,
    CheckCircle,
    FileExcel,
    Upload,
    Times,
    Plus,
    Check,
    User,
    Send,
    InfoCircle,
    ExclamationCircle,
    Megaphone,
  ],
  selector: 'app-masiva',
  templateUrl: './masiva.html',
})
export class Masiva {
  private readonly router = inject(Router);
  private readonly storage = inject(StorageServices);
  private readonly sessionsService = inject(SesionesServices);
  private readonly bulkService = inject(BulkService);
  private readonly swal = Swal.mixin({ theme: 'dark' });

  readonly userId = signal(this.storage.getUser()?.id ?? null);
  readonly sessionsResource = this.sessionsService.getUserSessions(this.userId);
  readonly formatPhone = formatEcuadorianPhone;
  readonly readySessions = computed(() =>
    this.sessionsResource.hasValue()
      ? this.sessionsResource
          .value()
          .data.filter((session) => session.isActive && session.status === SESSION_STATUS.READY)
      : [],
  );
  readonly sessionsError = computed(() => {
    if (!this.userId()) {
      return 'No se encontró el usuario autenticado.';
    }

    const error = this.sessionsResource.error();
    return error ? getBulkErrorMessage(error, 'No se pudieron cargar las sesiones.') : null;
  });
  readonly selectedSessionIds = signal<string[]>([]);
  readonly allReadySessionsSelected = computed(() => {
    const sessions = this.readySessions();
    return (
      sessions.length > 0 &&
      sessions.every((session) => this.selectedSessionIds().includes(session.sessionId))
    );
  });
  readonly recipients = signal<BulkRecipient[]>([]);
  readonly isEmojiPickerOpen = signal(false);
  readonly emojis = ['😀', '😂', '😍', '😊', '😉', '👍', '🙏', '❤️', '🎉', '🔥', '✅', '📞'];
  readonly recipientFileName = signal<string | null>(null);
  readonly recipientFileError = signal<string | null>(null);
  readonly isReadingFile = signal(false);
  readonly selectedVideo = signal<File | null>(null);
  readonly videoError = signal<string | null>(null);
  readonly recipientHeaders = computed(() =>
    this.recipients().length ? Object.keys(this.recipients()[0]) : [],
  );
  readonly detectedVariables = this.recipientHeaders;
  readonly previewHeaders = computed(() => this.recipientHeaders().slice(0, 5));
  readonly previewRecipients = computed(() => this.recipients().slice(0, 5));
  readonly messageLength = computed(() => this.campaignModel().message.length);
  readonly previewMessage = computed(() => {
    const recipient = this.recipients()[0];
    const message = this.campaignModel().message;
    return message.replace(
      /\{([^}]+)\}/g,
      (placeholder, key: string) => recipient?.[key] ?? placeholder,
    );
  });

  readonly campaignModel = signal({
    message: '',
    delayBetweenMessagesMinutes: 1,
    batchSize: 50,
    longPauseMinutes: 3,
    verifyDelayMinutes: 1,
    verifyNumbers: true,
  });
  readonly campaignForm = form(this.campaignModel, (path) => {
    required(path.message, { message: 'El mensaje es obligatorio.' });
    min(path.delayBetweenMessagesMinutes, 0, {
      message: 'La pausa entre mensajes no puede ser negativa.',
    });
    min(path.batchSize, 1, {
      message: 'El tamaño del lote debe ser al menos 1.',
    });
    min(path.longPauseMinutes, 0, {
      message: 'La pausa larga no puede ser negativa.',
    });
    min(path.verifyDelayMinutes, 0, {
      message: 'La pausa de verificación no puede ser negativa.',
    });
  });
  readonly isStarting = signal(false);

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
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        blankrows: false,
        defval: '',
        raw: false,
      });
      if (rows.length === 0) {
        throw new Error('La primera hoja no contiene destinatarios.');
      }

      const phoneHeader = Object.keys(rows[0]).find(
        (header) => normalizeBulkRecipientHeader(header) === 'phone',
      );
      if (!phoneHeader) {
        throw new Error(
          'El Excel debe incluir una columna "phone", "telefono", "teléfono" o "celular".',
        );
      }

      const importedRecipients = rows
        .map((row) => {
          const recipient: BulkRecipient = { phone: '' };
          for (const [header, value] of Object.entries(row)) {
            const trimmedHeader = header.trim();
            if (!trimmedHeader || trimmedHeader.startsWith('__EMPTY')) {
              continue;
            }

            const field = normalizeBulkRecipientHeader(trimmedHeader);
            const cellValue = this.toCellString(value);
            recipient[field] =
              field === 'phone' ? this.normalizeEcuadorianPhone(cellValue) : cellValue;
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
      this.recipientFileError.set(getBulkErrorMessage(error, 'No se pudo leer el archivo Excel.'));
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

  selectVideo(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const video = input.files?.[0] ?? null;
    input.value = '';
    this.videoError.set(null);
    if (!video) return;
    if (!video.type.startsWith('video/')) {
      this.selectedVideo.set(null);
      this.videoError.set('Selecciona un archivo de video.');
      return;
    }
    if (video.size === 0) {
      this.selectedVideo.set(null);
      this.videoError.set('El archivo de video está vacío.');
      return;
    }
    if (video.size > 16 * 1024 * 1024) {
      this.selectedVideo.set(null);
      this.videoError.set('El video no puede superar los 16 MB.');
      return;
    }
    this.selectedVideo.set(video);
  }

  clearVideo(): void {
    this.selectedVideo.set(null);
    this.videoError.set(null);
  }

  toggleNumberVerification(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    this.campaignModel.update((model) => ({
      ...model,
      verifyNumbers: input.checked,
    }));
  }

  insertVariable(variable: string, textarea: HTMLTextAreaElement): void {
    const token = `{${variable}}`;
    this.replaceMessageSelection(textarea, token, token.length);
  }

  isVariableUsed(variable: string): boolean {
    return this.campaignModel().message.includes(`{${variable}}`);
  }

  formatMessage(marker: '*' | '_' | '~' | '```', textarea: HTMLTextAreaElement): void {
    const message = this.campaignModel().message;
    const selectedText = message.slice(textarea.selectionStart, textarea.selectionEnd);
    const replacement = `${marker}${selectedText}${marker}`;
    const cursorOffset = selectedText ? replacement.length : marker.length;

    this.replaceMessageSelection(textarea, replacement, cursorOffset);
  }

  insertEmoji(emoji: string, textarea: HTMLTextAreaElement): void {
    this.replaceMessageSelection(textarea, emoji, emoji.length);
    this.isEmojiPickerOpen.set(false);
  }

  toggleEmojiPicker(): void {
    this.isEmojiPickerOpen.update((open) => !open);
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

  toggleAllSessions(): void {
    this.selectedSessionIds.set(
      this.allReadySessionsSelected()
        ? []
        : this.readySessions().map((session) => session.sessionId),
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
      const model = this.campaignModel();
      const sessionIds = [...this.selectedSessionIds()];
      const recipients = [...this.recipients()];
      const summary = document.createElement('div');
      summary.className = 'grid gap-3 text-left';

      const details = document.createElement('p');
      details.className = 'm-0 whitespace-pre-line';
      details.textContent = [
        `Sesiones conectadas: ${sessionIds.length}`,
        `Destinatarios: ${recipients.length}`,
        `Pausa entre mensajes: ${model.delayBetweenMessagesMinutes} min`,
        `Mensajes por lote: ${model.batchSize}`,
        `Pausa larga: ${model.longPauseMinutes} min`,
        `Pausa entre verificaciones: ${model.verifyDelayMinutes} min`,
        `Verificar números: ${model.verifyNumbers ? 'Sí' : 'No'}`,
        `Video adjunto: ${this.selectedVideo()?.name ?? 'No'}`,
      ].join('\n');

      const messageLabel = document.createElement('p');
      messageLabel.className = 'm-0 font-semibold';
      messageLabel.textContent = 'Mensaje a enviar';

      const message = document.createElement('p');
      message.className =
        'm-0 max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-surface-100 p-3 text-sm dark:bg-surface-800';
      message.textContent = model.message;

      summary.append(details, messageLabel, message);
      const confirmation = await this.swal.fire({
        icon: 'question',
        title: '¿Confirmas el envío masivo?',
        html: summary,
        showCancelButton: true,
        confirmButtonText: 'Sí, iniciar envío',
        cancelButtonText: 'No, cancelar',
        reverseButtons: true,
        focusCancel: true,
      });
      if (!confirmation.isConfirmed) {
        return;
      }

      this.isStarting.set(true);
      const request: BulkStartRequest = {
        message: model.message,
        delayBetweenMessagesMs: minutesToMilliseconds(model.delayBetweenMessagesMinutes),
        batchSize: model.batchSize,
        longPauseMs: minutesToMilliseconds(model.longPauseMinutes),
        verifyDelayMs: minutesToMilliseconds(model.verifyDelayMinutes),
        verifyNumbers: model.verifyNumbers,
        sessionIds,
        recipients,
      };

      let response: ApiResponse<BulkStartResponse>;
      try {
        response = await firstValueFrom(
          this.bulkService.start(request, this.selectedVideo()),
        );
      } catch (error: unknown) {
        this.isStarting.set(false);
        await this.showError(getBulkErrorMessage(error, 'No se pudo iniciar el envío masivo.'));
        return;
      }

      this.isStarting.set(false);
      await this.swal.fire({
        icon: 'success',
        title: 'Envío iniciado',
        text: response.data.message ?? response.message ?? 'El lote comenzó a procesarse.',
        confirmButtonText: 'Ver lote',
      });
      await this.router.navigate(['/lotes', response.data.batchId]);
    });
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

  private normalizeEcuadorianPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('593')) {
      return digits;
    }

    return digits.startsWith('0') ? `593${digits.slice(1)}` : digits;
  }

  private async showError(message: string): Promise<void> {
    await this.swal.fire({
      icon: 'error',
      title: 'No se pudo completar la operación',
      text: message,
      confirmButtonText: 'Aceptar',
    });
  }

  private replaceMessageSelection(
    textarea: HTMLTextAreaElement,
    replacement: string,
    cursorOffset: number,
  ): void {
    const message = this.campaignModel().message;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const updatedMessage = message.slice(0, start) + replacement + message.slice(end);

    this.campaignModel.update((model) => ({
      ...model,
      message: updatedMessage,
    }));

    const cursorPosition = start + cursorOffset;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  }
}
