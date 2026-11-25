import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { SESSION_STATUS } from '../../../../shared/constants/status.constants';
import type { ApiResponse } from '../../../../shared/models/api-response';
import { StorageServices } from '../../../../shared/services/storage-services';
import type { CreateSessionRequest, SessionQrData, UserSession } from '../../models/session.model';
import { SesionesServices } from '../../services/sesiones-services';

@Component({
  imports: [FormField],
  selector: 'app-sesiones',
  templateUrl: './sesiones.html',
})
export class Sesiones {
  private readonly sessionsService = inject(SesionesServices);
  private readonly storage = inject(StorageServices);
  private readonly swal = Swal.mixin({ theme: 'dark' });

  readonly userId = signal(this.storage.getUser()?.id ?? null);
  readonly sessionsResource = this.sessionsService.getUserSessions(this.userId);
  readonly sessions = computed(() =>
    this.sessionsResource.hasValue() ? this.sessionsResource.value().data : [],
  );
  readonly isLoading = this.sessionsResource.isLoading;
  readonly loadError = computed(() => {
    if (!this.userId()) {
      return 'No se encontró el usuario autenticado.';
    }

    const error = this.sessionsResource.error();
    return error ? this.getErrorMessage(error, 'No se pudieron cargar las sesiones.') : null;
  });
  readonly isCreateFormVisible = signal(false);
  readonly isCreating = signal(false);
  readonly restartingSession = signal<string | null>(null);
  readonly deletingSession = signal<string | null>(null);
  readonly createSessionModel = signal({ name: '' });
  readonly createSessionForm = form(this.createSessionModel, (path) => {
    required(path.name, { message: 'El nombre de la sesión es obligatorio.' });
  });
  readonly qrSessionId = signal<string | null>(null);
  readonly qrResource = this.sessionsService.getSessionQr(this.qrSessionId);
  readonly qrLoadingSession = this.qrSessionId;

  private readonly qrResourceEffect = effect(() => {
    const sessionId = this.qrSessionId();
    if (!sessionId) {
      return;
    }

    const status = this.qrResource.status();
    if (status === 'error') {
      const error = this.qrResource.error();
      this.qrSessionId.set(null);
      if (error) {
        void this.showError(this.getErrorMessage(error, 'No se pudo consultar el código QR.'));
      }
      return;
    }

    if (status !== 'resolved' || !this.qrResource.hasValue()) {
      return;
    }

    const session = this.sessions().find((item) => item.sessionId === sessionId);
    const qrData = this.qrResource.value().data;
    this.qrSessionId.set(null);

    if (!session) {
      void this.showError('No se encontró la sesión solicitada.');
      return;
    }

    void this.showQrResult(session, qrData);
  });

  reloadSessions(): void {
    this.sessionsResource.reload();
  }

  toggleCreateForm(): void {
    if (this.isCreateFormVisible()) {
      this.createSessionForm().reset({ name: '' });
      this.isCreateFormVisible.set(false);
      return;
    }

    this.isCreateFormVisible.set(true);
  }

  async createSession(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isCreating()) {
      return;
    }

    const user = this.storage.getUser();
    if (!user) {
      await this.showError('No se encontró el usuario autenticado.');
      return;
    }

    await submit(this.createSessionForm, async () => {
      this.isCreating.set(true);
      const request: CreateSessionRequest = {
        userId: user.id,
        name: this.createSessionModel().name.trim(),
      };

      let response: ApiResponse<UserSession>;
      try {
        response = await firstValueFrom(this.sessionsService.createSession(request));
      } catch (error: unknown) {
        this.isCreating.set(false);
        await this.showError(this.getErrorMessage(error, 'No se pudo crear la sesión.'));
        return;
      }

      this.isCreating.set(false);
      this.createSessionForm().reset({ name: '' });
      this.isCreateFormVisible.set(false);
      this.sessionsResource.reload();
      await this.swal.fire({
        icon: 'success',
        title: 'Sesión creada',
        text: response.message,
        confirmButtonText: 'Aceptar',
      });
    });
  }

  async viewQr(session: UserSession): Promise<void> {
    if (this.qrSessionId() || this.restartingSession() || this.deletingSession()) {
      return;
    }

    this.qrSessionId.set(session.sessionId);
  }

  private async showQrResult(session: UserSession, qrData: SessionQrData): Promise<void> {
    if (qrData.hasQr && qrData.qr) {
      const qrImage = qrData.qr.startsWith('data:image/')
        ? qrData.qr
        : `data:image/png;base64,${qrData.qr}`;
      await this.swal.fire({
        title: `Código QR: ${session.name}`,
        text: 'Escanea este código desde WhatsApp para conectar la sesión.',
        imageUrl: qrImage,
        imageAlt: `Código QR para conectar ${session.name}`,
        imageWidth: 280,
        confirmButtonText: 'Cerrar',
      });
      return;
    }

    if (qrData.status === SESSION_STATUS.READY) {
      await this.showInfo('Esta sesión ya está conectada.');
    } else if (qrData.status === SESSION_STATUS.PENDING) {
      await this.showInfo(
        'WhatsApp todavía está generando el código QR. Intenta de nuevo en unos segundos.',
      );
    } else if (qrData.hasQr) {
      await this.showError('La respuesta no incluyó una imagen QR válida.');
    } else {
      await this.showWarning('La sesión no está activa. Reiníciala para obtener un código QR.');
    }
  }

  async restartSession(session: UserSession): Promise<void> {
    if (this.restartingSession() || this.deletingSession() || this.qrLoadingSession()) {
      return;
    }

    const confirmation = await this.swal.fire({
      icon: 'warning',
      title: '¿Reiniciar sesión?',
      text: `Se volverá a inicializar la sesión "${session.name}".`,
      showCancelButton: true,
      confirmButtonText: 'Reiniciar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmation.isConfirmed) {
      return;
    }

    this.restartingSession.set(session.id);
    let message: string;
    try {
      const response = await firstValueFrom(this.sessionsService.restartSession(session.sessionId));
      message = response.message;
    } catch (error: unknown) {
      this.restartingSession.set(null);
      await this.showError(this.getErrorMessage(error, 'No se pudo reiniciar la sesión.'));
      return;
    }
    this.restartingSession.set(null);

    this.sessionsResource.reload();
    await this.swal.fire({
      icon: 'success',
      title: 'Sesión reiniciada',
      text: message,
      confirmButtonText: 'Aceptar',
    });
  }

  async deleteSession(session: UserSession): Promise<void> {
    if (this.deletingSession() || this.restartingSession() || this.qrLoadingSession()) {
      return;
    }

    const confirmation = await this.swal.fire({
      icon: 'warning',
      title: '¿Eliminar sesión?',
      text: `Se eliminará la sesión "${session.name}". Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmation.isConfirmed) {
      return;
    }

    this.deletingSession.set(session.id);
    let message: string;
    try {
      const response = await firstValueFrom(this.sessionsService.deleteSession(session.sessionId));
      message = response.message;
    } catch (error: unknown) {
      this.deletingSession.set(null);
      await this.showError(this.getErrorMessage(error, 'No se pudo eliminar la sesión.'));
      return;
    }
    this.deletingSession.set(null);

    this.sessionsResource.reload();
    await this.swal.fire({
      icon: 'success',
      title: 'Sesión eliminada',
      text: message,
      confirmButtonText: 'Aceptar',
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case SESSION_STATUS.PENDING:
        return 'Pendiente';
      case SESSION_STATUS.READY:
        return 'Conectada';
      case SESSION_STATUS.DISCONNECTED:
        return 'Desconectada';
      case SESSION_STATUS.FAILED:
        return 'Fallida';
      default:
        return 'Desconocido';
    }
  }

  getStatusClasses(status: string): string {
    const baseClasses = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold';

    switch (status) {
      case SESSION_STATUS.PENDING:
        return `${baseClasses} bg-amber-500/10 text-amber-700 dark:text-amber-300`;
      case SESSION_STATUS.READY:
        return `${baseClasses} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`;
      case SESSION_STATUS.DISCONNECTED:
        return `${baseClasses} bg-surface-200 text-color-secondary dark:bg-surface-700`;
      case SESSION_STATUS.FAILED:
        return `${baseClasses} bg-red-500/10 text-red-700 dark:text-red-300`;
      default:
        return `${baseClasses} bg-surface-200 text-color-secondary dark:bg-surface-700`;
    }
  }

  private async showInfo(message: string): Promise<void> {
    await this.swal.fire({
      icon: 'info',
      title: 'Información',
      text: message,
      confirmButtonText: 'Aceptar',
    });
  }

  private async showWarning(message: string): Promise<void> {
    await this.swal.fire({
      icon: 'warning',
      title: 'Atención',
      text: message,
      confirmButtonText: 'Aceptar',
    });
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

    return fallback;
  }
}
