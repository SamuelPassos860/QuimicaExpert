import type { ReportPayload } from './reports';

export type AuditLogEventType =
  | 'login'
  | 'logout'
  | 'compound_saved'
  | 'compound_deleted'
  | 'pdf_exported';

export type AuditLogResourceType = 'session' | 'compound' | 'spectrophotometry_report';

export interface AuditLog {
  id: number;
  eventType: AuditLogEventType;
  resourceType: AuditLogResourceType;
  resourceKey: string | null;
  actor: {
    id: number | null;
    userId: string;
    fullName: string;
  };
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogFilters {
  eventType: '' | AuditLogEventType;
  userSearch: string;
}

export type ReportExportAuditPayload = ReportPayload;
