import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BulkService } from '../../services/bulk.service';
import {
  formatBulkDate,
  getBulkErrorMessage,
  getBulkStatusClasses,
  getBulkStatusLabel,
} from '../../utils/bulk.utils';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';

import { Plus } from '@primeicons/angular/plus';
import { Refresh } from '@primeicons/angular/refresh';
import { Eye } from '@primeicons/angular/eye';
import { ChevronLeft } from '@primeicons/angular/chevron-left';
import { ChevronRight } from '@primeicons/angular/chevron-right';
import { Inbox } from '@primeicons/angular/inbox';
import { ExclamationCircle } from '@primeicons/angular/exclamation-circle';

// agrega a imports: [ButtonModule, MessageModule, SkeletonModule, ProgressBarModule, TableModule,
//   Plus, Refresh, Eye, ChevronLeft, ChevronRight, Inbox, ExclamationCircle, ...los que ya tienes]
@Component({
  imports: [RouterLink,  ],
  selector: 'app-lotes',
  templateUrl: './lotes.html',
})
export class Lotes {
  private readonly bulkService = inject(BulkService);

  readonly page = signal(1);
  readonly historyResource = this.bulkService.getHistory(this.page);
  readonly history = computed(() =>
    this.historyResource.hasValue() ? this.historyResource.value().data : null,
  );
  readonly historyError = computed(() => {
    const error = this.historyResource.error();
    return error ? getBulkErrorMessage(error, 'No se pudo cargar el historial.') : null;
  });
  readonly getBulkStatusClasses = getBulkStatusClasses;
  readonly getBulkStatusLabel = getBulkStatusLabel;
  readonly formatDate = formatBulkDate;

  changePage(delta: number): void {
    const pagination = this.history()?.pagination;
    if (!pagination) {
      return;
    }

    this.page.update((current) => Math.min(pagination.totalPages, Math.max(1, current + delta)));
  }
}
