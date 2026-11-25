import { formatEcuadorianPhone } from './phone.utils';

describe('formatEcuadorianPhone', () => {
  it('formats Ecuadorian mobile numbers with country code and spacing', () => {
    expect(formatEcuadorianPhone('593967123741')).toBe('+593 96 712 3741');
    expect(formatEcuadorianPhone('0967123741')).toBe('+593 96 712 3741');
    expect(formatEcuadorianPhone('967123741')).toBe('+593 96 712 3741');
  });

  it('formats Ecuadorian landline numbers', () => {
    expect(formatEcuadorianPhone('59322345678')).toBe('+593 2 234 5678');
  });

  it('leaves other formats unchanged', () => {
    expect(formatEcuadorianPhone('+1 202 555 0144')).toBe('+1 202 555 0144');
    expect(formatEcuadorianPhone(null)).toBe('');
  });
});
