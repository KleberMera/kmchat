import { TestBed } from '@angular/core/testing';
import { SesionesServices } from './sesiones-services';

describe('SesionesServices', () => {
  let service: SesionesServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SesionesServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
