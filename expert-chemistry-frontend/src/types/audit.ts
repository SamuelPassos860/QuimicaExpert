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

export interface ReportExportAuditPayload {
  reportId: string;
  compoundName: string;
  casId: string;
  lambdaMax: string;
  source: string;
  epsilonValue: number;
  pathLengthValue: number;
  concentrationValue: number;
  absorbance: number;
  generatedAt: string;
  generatedByName: string;
  generatedByUserId: string;
}
