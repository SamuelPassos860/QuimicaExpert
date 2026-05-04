import { pool } from '../db.ts';
import { initializeAuthSchema } from './auth.ts';
import type {
  AuditLogRow,
  CreateAuditLogInput,
  ListAuditLogsFilters
} from '../types/audit.ts';
import { toLikePattern } from '../utils/http.ts';

let schemaReadyPromise: Promise<void> | null = null;

const listAuditLogsQuery = `
  SELECT
    id,
    actor_user_id,
    actor_user_identifier,
    actor_full_name,
    event_type,
    resource_type,
    resource_key,
    metadata,
    created_at
  FROM audit_logs
  WHERE ($1::text IS NULL OR event_type = $1)
    AND ($2::text IS NULL OR resource_type = $2)
    AND (
      $3 = ''
      OR actor_user_identifier ILIKE $3
      OR actor_full_name ILIKE $3
    )
  ORDER BY created_at DESC
  LIMIT $4
`;

async function ensureAuditLogsTable() {
  await initializeAuthSchema();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_user_id BIGINT NULL,
      actor_user_identifier VARCHAR(100) NOT NULL,
      actor_full_name VARCHAR(160) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      resource_type VARCHAR(50) NOT NULL,
      resource_key VARCHAR(200) NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT audit_logs_actor_user_id_fkey
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
    ON audit_logs (created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS audit_logs_event_type_idx
    ON audit_logs (event_type)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx
    ON audit_logs (actor_user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS audit_logs_resource_lookup_idx
    ON audit_logs (resource_type, resource_key)
  `);
}

export async function initializeAuditSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureAuditLogsTable();
  }

  await schemaReadyPromise;
}

function mapAuditLogRow(row: AuditLogRow) {
  return {
    id: row.id,
    eventType: row.event_type,
    resourceType: row.resource_type,
    resourceKey: row.resource_key,
    actor: {
      id: row.actor_user_id,
      userId: row.actor_user_identifier,
      fullName: row.actor_full_name
    },
    metadata: row.metadata || {},
    createdAt: row.created_at
  };
}

export async function createAuditLog(input: CreateAuditLogInput) {
  await initializeAuditSchema();

  const result = await pool.query<AuditLogRow>(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        actor_user_identifier,
        actor_full_name,
        event_type,
        resource_type,
        resource_key,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING
        id,
        actor_user_id,
        actor_user_identifier,
        actor_full_name,
        event_type,
        resource_type,
        resource_key,
        metadata,
        created_at
    `,
    [
      input.actorUserId,
      input.actorUserIdentifier,
      input.actorFullName,
      input.eventType,
      input.resourceType,
      input.resourceKey || null,
      JSON.stringify(input.metadata || {})
    ]
  );

  return mapAuditLogRow(result.rows[0]!);
}

export async function listAuditLogs(filters: ListAuditLogsFilters) {
  await initializeAuditSchema();

  const limit = Math.min(Math.max(filters.limit || 100, 1), 200);
  const result = await pool.query<AuditLogRow>(listAuditLogsQuery, [
    filters.eventType || null,
    filters.resourceType || null,
    toLikePattern(filters.userSearch || ''),
    limit
  ]);

  return result.rows.map(mapAuditLogRow);
}
