import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StorageServices } from '../../../shared/services/storage-services';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;
  let storage: StorageServices;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(StorageServices);
  });

  afterEach(() => {
    httpTestingController.verify();
    storage.clearUser();
  });

  it('posts credentials and stores only the returned user data', () => {
    const credentials = { username: 'test-user', password: 'test-password' };
    const user = {
      id: 'user-id',
      firstName: 'Kleber',
      lastName: 'Alexis',
      username: credentials.username,
      status: 'A',
    };

    service.login(credentials).subscribe((response) => {
      expect(response.data).toEqual(user);
      expect(storage.getUser()).toEqual(user);
    });

    const request = httpTestingController.expectOne(
      'http://localhost:2261/api/auth/login',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);
    request.flush({
      data: user,
      message: 'Usuario autenticado correctamente',
      status: 201,
    });

    expect(localStorage.getItem('kmchat.authenticated-user')).not.toContain('test-password');
  });
});
