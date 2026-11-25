export function formatEcuadorianPhone(phone: string | null | undefined): string {
  if (!phone) {
    return '';
  }

  const digits = phone.replace(/\D/g, '');
  const nationalNumber = digits.startsWith('593')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;

  if (nationalNumber.length === 9 && nationalNumber.startsWith('9')) {
    const groups = [
      nationalNumber.slice(0, 2),
      nationalNumber.slice(2, 5),
      nationalNumber.slice(5),
    ];
    return `+593 ${groups.join(' ')}`;
  }

  if (nationalNumber.length === 8 && /^[2-7]/.test(nationalNumber)) {
    const groups = [
      nationalNumber.slice(0, 1),
      nationalNumber.slice(1, 4),
      nationalNumber.slice(4),
    ];
    return `+593 ${groups.join(' ')}`;
  }

  return phone;
}

export function formatEcuadorianPhoneForExport(phone: string | null | undefined): string {
  if (!phone) {
    return '';
  }

  const digits = phone.replace(/\D/g, '');
  const nationalNumber = digits.startsWith('593')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;

  if (
    (nationalNumber.length === 9 && nationalNumber.startsWith('9')) ||
    (nationalNumber.length === 8 && /^[2-7]/.test(nationalNumber))
  ) {
    return `0${nationalNumber}`;
  }

  return phone;
}
