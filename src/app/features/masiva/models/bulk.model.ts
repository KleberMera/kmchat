export interface BulkRecipient {
  phone: string;
  [key: string]: string;
}

export interface BulkStartRequest {
  sessionIds: string[];
  recipients: BulkRecipient[];
  message: string;
  delayBetweenMessagesMs: number;
  batchSize: number;
  longPauseMs: number;
  verifyDelayMs: number;
}

export interface BulkStartResponse {
  batchId: string;
  total: number;
  status: string;
  message?: string;
}

export interface BulkPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BulkBatchSummary {
  id: string;
  total: number;
  processed: number;
  sent: number;
  failed: number;
  invalid: number;
  progress: number;
  status: string;
  currentSessionId: string | null;
  createdAt: string;
}

export type BulkBatchStatus = BulkBatchSummary;

export interface BulkBatchDetail extends BulkBatchSummary {
  config: BulkStartRequest;
}

export interface BulkHistoryData {
  items: BulkBatchSummary[];
  pagination: BulkPagination;
}

export interface BulkMessageLog {
  id: string;
  batchId: string;
  phoneNumber: string;
  sessionId: string;
  sessionPhoneNumber: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: string | null;
}

export interface BulkLogsData {
  items: BulkMessageLog[];
  pagination?: BulkPagination;
}
