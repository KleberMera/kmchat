import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import type { ApiResponse } from '../../../../shared/models/api-response';
import type { AuthenticatedUser } from '../../../../shared/services/storage-services';
import { AuthService } from '../../services/auth.service';

@Component({
  imports: [FormField],
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly swal = Swal.mixin({ theme: 'dark' });

  readonly isSubmitting = signal(false);
  readonly loginModel = signal({ username: '', password: '' });
  readonly loginForm = form(this.loginModel, (path) => {
    required(path.username, { message: 'El usuario es obligatorio.' });
    required(path.password, { message: 'La contraseña es obligatoria.' });
  });

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isSubmitting()) {
      return;
    }

    await submit(this.loginForm, async () => {
      this.isSubmitting.set(true);

      let response: ApiResponse<AuthenticatedUser> | null = null;
      try {
        response = await firstValueFrom(
          this.auth.login(this.loginModel()),
        );
      } catch (error: unknown) {
        this.isSubmitting.set(false);
        await this.swal.fire({
          icon: 'error',
          title: 'No se pudo iniciar sesión',
          text: this.getErrorMessage(error),
          confirmButtonText: 'Aceptar',
        });
        return;
      }

      this.isSubmitting.set(false);
      await this.swal.fire({
        icon: 'success',
        title: 'Bienvenido',
        text: response.message,
        confirmButtonText: 'Continuar',
      });
      await this.router.navigateByUrl('/dashboard');
    });
  }

  private getErrorMessage(error: unknown): string {
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

    return 'Verifica tus datos e inténtalo de nuevo.';
  }
}
