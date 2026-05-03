export const AUDIT_EVENT_TYPES = [
  'login',
  'logout',
  'compound_saved',
  'compound_deleted',
  'pdf_exported'
] as const;

export const AUDIT_RESOURCE_TYPES = [
  'session',
  'compound',
  'spectrophotometry_report'
] as const;

export type AuditLogEventType = (typeof AUDIT_EVENT_TYPES)[number];
export type AuditLogResourceType = (typeof AUDIT_RESOURCE_TYPES)[number];

export interface AuditLogRow {
  id: number;
  actor_user_id: number | null;
  actor_user_identifier: string;
  actor_full_name: string;
  event_type: AuditLogEventType;
  resource_type: AuditLogResourceType;
  resource_key: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateAuditLogInput {
  actorUserId: number | null;
  actorUserIdentifier: string;
  actorFullName: string;
  eventType: AuditLogEventType;
  resourceType: AuditLogResourceType;
  resourceKey?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ListAuditLogsFilters {
  eventType?: AuditLogEventType;
  resourceType?: AuditLogResourceType;
  userSearch?: string;
  limit?: number;
}

export interface ReportExportAuditBody {
  reportId?: string;
  compoundName?: string;
  casId?: string;
  lambdaMax?: string;
  source?: string;
  epsilonValue?: number | string | null;
  pathLengthValue?: number | string | null;
  concentrationValue?: number | string | null;
  absorbance?: number | string | null;
  generatedAt?: string;
  generatedByName?: string;
  generatedByUserId?: string;
}
