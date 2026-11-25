import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BulkService } from '../../services/bulk.service';
import {
  formatBulkDate,
  getBulkErrorMessage,
  getBulkStatusClasses,
  getBulkStatusLabel,
} from '../../utils/bulk.utils';

@Component({
  imports: [RouterLink],
  selector: 'app-lotes',
  templateUrl: './lotes.html',
})
export class Lotes {
  private readonly bulkService = inject(BulkService);

  readonly page = signal(1);
  readonly historyResource = this.bulkService.getHistory(this.page);
  readonly history = computed(() =>
    this.historyResource.hasValue()
      ? this.historyResource.value().data
      : null,
  );
  readonly historyError = computed(() => {
    const error = this.historyResource.error();
    return error
      ? getBulkErrorMessage(error, 'No se pudo cargar el historial.')
      : null;
  });
  readonly getBulkStatusClasses = getBulkStatusClasses;
  readonly getBulkStatusLabel = getBulkStatusLabel;
  readonly formatDate = formatBulkDate;

  changePage(delta: number): void {
    const pagination = this.history()?.pagination;
    if (!pagination) {
      return;
    }

    this.page.update((current) =>
      Math.min(pagination.totalPages, Math.max(1, current + delta)),
    );
  }
}
