import type { ReportPayload } from './reports';

export type AuditLogEventType =
  | 'login'
  | 'logout'
  | 'email_confirmed'
  | 'user_created'
  | 'analysis_field_changed'
  | 'analysis_report_printed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'compound_saved'
  | 'compound_deleted'
  | 'pdf_exported';

export type AuditLogResourceType = 'session' | 'user' | 'compound' | 'analysis' | 'spectrophotometry_report';

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
