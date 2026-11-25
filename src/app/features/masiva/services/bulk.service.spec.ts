import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import type { BulkStartRequest } from '../models/bulk.model';
import { BulkService } from './bulk.service';

describe('BulkService', () => {
  let service: BulkService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BulkService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads all logs without server-side pagination query parameters', () => {
    const batchId = signal<string | null>('batch-id');
    const resource = TestBed.runInInjectionContext(() => service.getLogs(batchId));
    TestBed.flushEffects();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/bulk/batch-id/logs`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      data: {
        items: [
          {
            id: 'log-id',
            batchId: 'batch-id',
            phoneNumber: '593961137973',
            sessionId: 'session-id',
            sessionPhoneNumber: null,
            status: 'SENT',
            errorMessage: null,
            sentAt: null,
          },
        ],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      },
      message: 'OK',
      status: 200,
    });
    TestBed.flushEffects();

    expect(resource.value()?.data.items).toHaveLength(1);
  });

  it('starts a bulk batch with the selected sessions, recipients, and settings', () => {
    const requestBody: BulkStartRequest = {
      sessionIds: ['session-id'],
      recipients: [{ phone: '593999000001', nombre: 'Ana' }],
      message: 'Hola {nombre}',
      delayBetweenMessagesMs: 1000,
      batchSize: 50,
      longPauseMs: 30000,
      verifyDelayMs: 1000,
    };

    service.start(requestBody).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/bulk/start`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(requestBody);
    request.flush({
      data: {
        batchId: 'batch-id',
        total: 1,
        status: 'PENDING',
        message: 'Envío iniciado',
      },
      message: 'OK',
      status: 201,
    });
  });
});
