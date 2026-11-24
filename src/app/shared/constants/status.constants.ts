export const USER_STATUS = {
  ACTIVE: 'A',
  INACTIVE: 'I',
} as const;

export const SESSION_STATUS = {
  PENDING: 'P',
  READY: 'R',
  DISCONNECTED: 'D',
  FAILED: 'F',
} as const;
