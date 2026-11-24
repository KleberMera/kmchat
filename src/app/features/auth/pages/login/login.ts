import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly swal = Swal.mixin({ theme: 'dark' });

  readonly isSubmitting = signal(false);
  readonly loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
  });

  login(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        void this.swal
          .fire({
            icon: 'success',
            title: 'Bienvenido',
            text: response.message,
            confirmButtonText: 'Continuar',
          })
          .then(() => this.router.navigateByUrl('/dashboard'));
      },
      error: (error: unknown) => {
        this.isSubmitting.set(false);
        void this.swal.fire({
          icon: 'error',
          title: 'No se pudo iniciar sesión',
          text: this.getErrorMessage(error),
          confirmButtonText: 'Aceptar',
        });
      },
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
