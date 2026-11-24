export interface UserSession {
  id: string;
  sessionId: string;
  name: string;
  phoneNumber: string | null;
  status: string;
  userId: string;
  isActive: boolean;
}

export interface CreateSessionRequest {
  userId: string;
  name: string;
}

export interface SessionQrData {
  hasQr: boolean;
  qr?: string | null;
  status?: string;
}
