import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../../../../environments/environment';
import {
  minutesToMilliseconds,
  normalizeBulkRecipientHeader,
} from '../../utils/bulk.utils';
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
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
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
    TestBed.flushEffects();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    httpTestingController.verify();
    localStorage.removeItem('kmchat.authenticated-user');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('only makes active, connected sessions available for selection', () => {
    expect(
      component.readySessions().map((session) => session.sessionId),
    ).toEqual(['ready-session']);
  });

  it('normalizes phone column aliases from recipient files', () => {
    for (const header of ['phone', 'PHONE', 'telefono', 'teléfono', 'CELULAR', ' celular ']) {
      expect(normalizeBulkRecipientHeader(header)).toBe('phone');
    }

    expect(normalizeBulkRecipientHeader(' Nombre ')).toBe('Nombre');
  });

  it('selects and deselects all ready sessions', () => {
    component.toggleAllSessions();
    expect(component.selectedSessionIds()).toEqual(['ready-session']);
    expect(component.allReadySessionsSelected()).toBe(true);

    component.toggleAllSessions();
    expect(component.selectedSessionIds()).toEqual([]);
    expect(component.allReadySessionsSelected()).toBe(false);
  });

  it('wraps selected message text with WhatsApp formatting markers', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    const textarea = fixture.nativeElement.querySelector('#bulk-message');
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error('Message textarea was not rendered.');
    }
    component.campaignModel.update((model) => ({ ...model, message: 'Hola mundo' }));
    fixture.detectChanges();
    textarea.value = 'Hola mundo';
    textarea.setSelectionRange(5, 10);

    component.formatMessage('*', textarea);

    expect(component.campaignModel().message).toBe('Hola *mundo*');
  });

  it('inserts an emoji at the current message selection', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    const textarea = fixture.nativeElement.querySelector('#bulk-message');
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error('Message textarea was not rendered.');
    }
    component.campaignModel.update((model) => ({ ...model, message: 'Hola mundo' }));
    fixture.detectChanges();
    textarea.value = 'Hola mundo';
    textarea.setSelectionRange(5, 5);
    component.isEmojiPickerOpen.set(true);

    component.insertEmoji('😀', textarea);

    expect(component.campaignModel().message).toBe('Hola 😀mundo');
    expect(component.isEmojiPickerOpen()).toBe(false);
  });

  it('keeps phone normalization details out of the screen', () => {
    expect(fixture.nativeElement.textContent).not.toContain(
      'automáticamente a formato',
    );
    expect(fixture.nativeElement.textContent).not.toContain('09XXXXXXXX');
    expect(fixture.nativeElement.textContent).toContain('Vista previa del mensaje');
    expect(fixture.nativeElement.textContent).not.toContain('Progreso del envío');
  });

  it('previews the message with the first recipient values', () => {
    component.recipients.set([
      { phone: '593999000001', nombre: 'Ana' },
    ]);
    component.campaignModel.update((model) => ({
      ...model,
      message: 'Hola {nombre}',
    }));

    expect(component.previewMessage()).toBe('Hola Ana');
    expect(component.detectedVariables()).toEqual(['phone', 'nombre']);
  });

  it('converts displayed minutes to the API millisecond unit', () => {
    expect(minutesToMilliseconds(1)).toBe(60000);
    expect(minutesToMilliseconds(3)).toBe(180000);
  });

  it('starts with pacing values displayed as minutes', () => {
    expect(component.campaignModel()).toMatchObject({
      delayBetweenMessagesMinutes: 1,
      batchSize: 50,
      longPauseMinutes: 3,
      verifyDelayMinutes: 1,
    });
  });
});
