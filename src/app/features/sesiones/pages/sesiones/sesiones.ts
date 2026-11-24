import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { SESSION_STATUS } from '../../../../shared/constants/status.constants';
import type { ApiResponse } from '../../../../shared/models/api-response';
import { StorageServices } from '../../../../shared/services/storage-services';
import type {
  CreateSessionRequest,
  SessionQrData,
  UserSession,
} from '../../models/session.model';
import { SesionesServices } from '../../services/sesiones-services';

@Component({
  imports: [FormField],
  selector: 'app-sesiones',
  templateUrl: './sesiones.html',
})
export class Sesiones implements OnInit {
  private readonly sessionsService = inject(SesionesServices);
  private readonly storage = inject(StorageServices);
  private readonly swal = Swal.mixin({ theme: 'dark' });

  readonly sessions = signal<UserSession[]>([]);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly isCreateFormVisible = signal(false);
  readonly isCreating = signal(false);
  readonly qrLoadingSession = signal<string | null>(null);
  readonly restartingSession = signal<string | null>(null);
  readonly createSessionModel = signal({ name: '' });
  readonly createSessionForm = form(this.createSessionModel, (path) => {
    required(path.name, { message: 'El nombre de la sesión es obligatorio.' });
  });

  ngOnInit(): void {
    void this.loadSessions();
  }

  async loadSessions(): Promise<void> {
    const user = this.storage.getUser();
    if (!user) {
      this.sessions.set([]);
      this.loadError.set('No se encontró el usuario autenticado.');
      return;
    }

    this.isLoading.set(true);
    this.loadError.set(null);

    try {
      const response = await firstValueFrom(
        this.sessionsService.getUserSessions(user.id),
      );
      this.sessions.set(response.data);
    } catch (error: unknown) {
      this.loadError.set(
        this.getErrorMessage(error, 'No se pudieron cargar las sesiones.'),
      );
    } finally {
      this.isLoading.set(false);
    }
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
        response = await firstValueFrom(
          this.sessionsService.createSession(request),
        );
      } catch (error: unknown) {
        this.isCreating.set(false);
        await this.showError(
          this.getErrorMessage(error, 'No se pudo crear la sesión.'),
        );
        return;
      }

      this.isCreating.set(false);
      this.createSessionForm().reset({ name: '' });
      this.isCreateFormVisible.set(false);
      await this.loadSessions();
      await this.swal.fire({
        icon: 'success',
        title: 'Sesión creada',
        text: response.message,
        confirmButtonText: 'Aceptar',
      });
    });
  }

  async viewQr(session: UserSession): Promise<void> {
    if (this.qrLoadingSession()) {
      return;
    }

    this.qrLoadingSession.set(session.id);
    let response: ApiResponse<SessionQrData>;
    try {
      response = await firstValueFrom(
        this.sessionsService.getSessionQr(session.sessionId),
      );
    } catch (error: unknown) {
      this.qrLoadingSession.set(null);
      await this.showError(
        this.getErrorMessage(error, 'No se pudo consultar el código QR.'),
      );
      return;
    }
    this.qrLoadingSession.set(null);

    const qrData = response.data;
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
      await this.showWarning(
        'La sesión no está activa. Reiníciala para obtener un código QR.',
      );
    }
  }

  async restartSession(session: UserSession): Promise<void> {
    if (this.restartingSession()) {
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
      const response = await firstValueFrom(
        this.sessionsService.restartSession(session.sessionId),
      );
      message = response.message;
    } catch (error: unknown) {
      this.restartingSession.set(null);
      await this.showError(
        this.getErrorMessage(error, 'No se pudo reiniciar la sesión.'),
      );
      return;
    }
    this.restartingSession.set(null);

    await this.loadSessions();
    await this.swal.fire({
      icon: 'success',
      title: 'Sesión reiniciada',
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
    const baseClasses =
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold';

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
