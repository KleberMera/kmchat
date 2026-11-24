import { TestBed } from '@angular/core/testing';
import { StorageServices } from './storage-services';

describe('StorageServices', () => {
  let service: StorageServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageServices);
    service.clearUser();
  });

  afterEach(() => {
    service.clearUser();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('stores the authenticated user in localStorage', () => {
    const user = {
      id: 'user-id',
      firstName: 'Kleber',
      lastName: 'Alexis',
      username: 'test-user',
      status: 'A',
    };

    service.saveUser(user);

    expect(service.getUser()).toEqual(user);
    expect(localStorage.getItem('kmchat.authenticated-user')).not.toContain('password');
  });
});
