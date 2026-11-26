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
            sessionName: 'Atención principal',
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
      verifyNumbers: false,
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

  it('uploads a selected video as multipart data with the batch config', () => {
    const requestBody: BulkStartRequest = {
      sessionIds: ['session-id'],
      recipients: [{ phone: '593999000001' }],
      message: 'Hola',
      delayBetweenMessagesMs: 0,
      batchSize: 1,
      longPauseMs: 0,
      verifyDelayMs: 0,
      verifyNumbers: true,
    };
    const video = new File(['video-content'], 'promo.mp4', {
      type: 'video/mp4',
    });

    service.start(requestBody, video).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/bulk/start`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    const formData = request.request.body as FormData;
    expect(formData.get('config')).toBe(JSON.stringify(requestBody));
    expect(formData.get('video')).toBe(video);
    request.flush({
      data: {
        batchId: 'batch-id',
        total: 1,
        status: 'PENDING',
      },
      message: 'OK',
      status: 201,
    });
  });

  it('calls the lote actions on their matching API routes', () => {
    service.pause('batch-id').subscribe();
    const pauseRequest = httpTestingController.expectOne(
      `${environment.apiUrl}/bulk/batch-id/pause`,
    );
    expect(pauseRequest.request.method).toBe('POST');
    pauseRequest.flush({ data: { batchId: 'batch-id', status: 'PAUSED' } });

    service.restart('batch-id').subscribe();
    const restartRequest = httpTestingController.expectOne(
      `${environment.apiUrl}/bulk/batch-id/restart`,
    );
    expect(restartRequest.request.method).toBe('POST');
    restartRequest.flush({ data: { batchId: 'batch-id', status: 'PENDING' } });

    service.remove('batch-id').subscribe();
    const removeRequest = httpTestingController.expectOne(
      `${environment.apiUrl}/bulk/batch-id`,
    );
    expect(removeRequest.request.method).toBe('DELETE');
    removeRequest.flush({ data: { batchId: 'batch-id', deleted: true } });
  });
});
