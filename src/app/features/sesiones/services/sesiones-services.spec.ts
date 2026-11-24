import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { SesionesServices } from './sesiones-services';

describe('SesionesServices', () => {
  let service: SesionesServices;
  let httpTestingController: HttpTestingController;
  const sessionsUrl = `${environment.apiUrl}/sessions`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SesionesServices);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads sessions for a user', () => {
    service.getUserSessions('user-id').subscribe();

    const request = httpTestingController.expectOne(
      `${sessionsUrl}/user/user-id`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], message: 'OK', status: 200 });
  });

  it('creates a session with its user id and name', () => {
    const payload = { userId: 'user-id', name: 'Atención' };

    service.createSession(payload).subscribe();

    const request = httpTestingController.expectOne(sessionsUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      data: {
        id: 'database-id',
        sessionId: 'session-id',
        name: payload.name,
        phoneNumber: null,
        status: 'P',
        userId: payload.userId,
        isActive: false,
      },
      message: 'Creada',
      status: 201,
    });
  });

  it('requests a session QR by its session id', () => {
    service.getSessionQr('session-id').subscribe();

    const request = httpTestingController.expectOne(
      `${sessionsUrl}/session-id/qr`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      data: { hasQr: true, qr: 'base64-image', status: 'P' },
      message: 'OK',
      status: 200,
    });
  });

  it('restarts a session by its session id', () => {
    service.restartSession('session-id').subscribe();

    const request = httpTestingController.expectOne(
      `${sessionsUrl}/session-id/restart`,
    );
    expect(request.request.method).toBe('POST');
    request.flush({ data: null, message: 'Reiniciada', status: 200 });
  });
});
