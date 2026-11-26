import { HttpErrorResponse } from '@angular/common/http';

const PHONE_HEADER_ALIASES = new Set(['phone', 'telefono', 'teléfono', 'celular']);

export function normalizeBulkRecipientHeader(header: string): string {
  const trimmedHeader = header.trim();
  return PHONE_HEADER_ALIASES.has(trimmedHeader.toLowerCase()) ? 'phone' : trimmedHeader;
}

export function getBulkStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'PROCESSING':
      return 'En proceso';
    case 'PAUSED':
      return 'Pausado';
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

export function getBulkStatusClasses(status: string): string {
  const baseClasses =
    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold';

  switch (status) {
    case 'PENDING':
      return `${baseClasses} bg-amber-500/10 text-amber-700 dark:text-amber-300`;
    case 'PROCESSING':
      return `${baseClasses} bg-blue-500/10 text-blue-700 dark:text-blue-300`;
    case 'COMPLETED':
    case 'SENT':
      return `${baseClasses} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`;
    case 'FAILED':
      return `${baseClasses} bg-red-500/10 text-red-700 dark:text-red-300`;
    case 'INVALID':
      return `${baseClasses} bg-amber-500/10 text-amber-700 dark:text-amber-300`;
    case 'PAUSED':
      return `${baseClasses} bg-orange-500/10 text-orange-700 dark:text-orange-300`;
    default:
      return `${baseClasses} bg-surface-200 text-color-secondary dark:bg-surface-700`;
  }
}

export function formatBulkDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function minutesToMilliseconds(minutes: number): number {
  return Math.round(minutes * 60_000);
}

export function getBulkErrorMessage(error: unknown, fallback: string): string {
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
