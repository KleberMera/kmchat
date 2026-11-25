import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { Masiva } from './masiva';

describe('Masiva', () => {
  let component: Masiva;
  let fixture: ComponentFixture<Masiva>;
  let httpTestingController: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(async () => {
    localStorage.setItem(
      'kmchat.authenticated-user',
      JSON.stringify({
        id: 'test-user',
        firstName: 'Test',
        lastName: 'User',
        username: 'test-user',
        status: 'A',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [Masiva],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Masiva);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.flushEffects();

    httpTestingController
      .expectOne(`${apiUrl}/sessions/user/test-user`)
      .flush({
        data: [
          {
            id: 'ready-id',
            sessionId: 'ready-session',
            name: 'Ready',
            phoneNumber: '593999000001',
            status: 'R',
            userId: 'test-user',
            isActive: true,
          },
          {
            id: 'pending-id',
            sessionId: 'pending-session',
            name: 'Pending',
            phoneNumber: null,
            status: 'P',
            userId: 'test-user',
            isActive: true,
          },
          {
            id: 'inactive-id',
            sessionId: 'inactive-session',
            name: 'Inactive',
            phoneNumber: null,
            status: 'R',
            userId: 'test-user',
            isActive: false,
          },
        ],
        message: 'OK',
        status: 200,
      });
    httpTestingController
      .expectOne(`${apiUrl}/bulk?page=1&limit=20`)
      .flush({
        data: {
          items: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        },
        message: 'OK',
        status: 200,
      });
    TestBed.flushEffects();
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('kmchat.authenticated-user');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('only makes active, connected sessions available for selection', () => {
    expect(component.readySessions().map((session) => session.sessionId)).toEqual([
      'ready-session',
    ]);
  });
});
