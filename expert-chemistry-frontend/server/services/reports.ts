import { pool } from '../db.js';
import type { CreateReportInput, ReportRow } from '../types/reports.js';
import { parseChemicalNumber } from '../utils/chemistry.js';
import { toLikePattern } from '../utils/http.js';

let schemaReadyPromise: Promise<void> | null = null;

const listReportsQuery = `
  SELECT
    id,
    report_id,
    project_id,
    project_name,
    owner_user_id,
    owner_user_identifier,
    owner_full_name,
    compound_name,
    cas_id,
    lambda_max,
    solvent,
    source,
    epsilon_value,
    path_length_value,
    concentration_value,
    absorbance,
    generated_at,
    created_at
  FROM reports
  WHERE
    ($1::boolean = true OR owner_user_id = $2)
    AND ($3 = '' OR report_id ILIKE $3 OR project_id ILIKE $3 OR project_name ILIKE $3 OR compound_name ILIKE $3 OR cas_id ILIKE $3)
  ORDER BY created_at DESC, id DESC
  LIMIT 500;
`;

const insertReportQuery = `
  INSERT INTO reports (
    report_id,
    project_id,
    project_name,
    owner_user_id,
    owner_user_identifier,
    owner_full_name,
    compound_name,
    cas_id,
    lambda_max,
    solvent,
    source,
    epsilon_value,
    path_length_value,
    concentration_value,
    absorbance,
    generated_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
  ON CONFLICT (report_id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    project_name = EXCLUDED.project_name,
    owner_user_id = EXCLUDED.owner_user_id,
    owner_user_identifier = EXCLUDED.owner_user_identifier,
    owner_full_name = EXCLUDED.owner_full_name,
    compound_name = EXCLUDED.compound_name,
    cas_id = EXCLUDED.cas_id,
    lambda_max = EXCLUDED.lambda_max,
    solvent = EXCLUDED.solvent,
    source = EXCLUDED.source,
    epsilon_value = EXCLUDED.epsilon_value,
    path_length_value = EXCLUDED.path_length_value,
    concentration_value = EXCLUDED.concentration_value,
    absorbance = EXCLUDED.absorbance,
    generated_at = EXCLUDED.generated_at,
    created_at = NOW()
  RETURNING
    id,
    report_id,
    project_id,
    project_name,
    owner_user_id,
    owner_user_identifier,
    owner_full_name,
    compound_name,
    cas_id,
    lambda_max,
    solvent,
    source,
    epsilon_value,
    path_length_value,
    concentration_value,
    absorbance,
    generated_at,
    created_at;
`;

async function ensureReportsSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id BIGSERIAL PRIMARY KEY,
      report_id VARCHAR(120) NOT NULL UNIQUE,
      project_id VARCHAR(120) NOT NULL DEFAULT '',
      project_name VARCHAR(255) NOT NULL DEFAULT '',
      owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_user_identifier VARCHAR(100) NOT NULL,
      owner_full_name VARCHAR(160) NOT NULL,
      compound_name VARCHAR(255) NOT NULL,
      cas_id VARCHAR(100) NOT NULL,
      lambda_max VARCHAR(100) NOT NULL,
      solvent VARCHAR(160) NOT NULL DEFAULT 'N/A',
      source VARCHAR(100) NOT NULL,
      epsilon_value DOUBLE PRECISION NOT NULL,
      path_length_value DOUBLE PRECISION NOT NULL,
      concentration_value DOUBLE PRECISION NOT NULL,
      absorbance DOUBLE PRECISION NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS solvent VARCHAR(160) NOT NULL DEFAULT 'N/A'
  `);

  await pool.query(`
    ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS project_id VARCHAR(120) NOT NULL DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS project_name VARCHAR(255) NOT NULL DEFAULT ''
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS reports_owner_user_id_idx
    ON reports (owner_user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS reports_created_at_idx
    ON reports (created_at DESC)
  `);
}

export async function initializeReportsSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureReportsSchema();
  }

  await schemaReadyPromise;
}

function mapReportRow(row: ReportRow) {
  return {
    id: Number(row.id),
    reportId: row.report_id,
    projectId: row.project_id || undefined,
    projectName: row.project_name || undefined,
    compoundName: row.compound_name,
    casId: row.cas_id,
    lambdaMax: row.lambda_max,
    solvent: row.solvent,
    source: row.source,
    epsilonValue: parseChemicalNumber(row.epsilon_value),
    pathLengthValue: parseChemicalNumber(row.path_length_value),
    concentrationValue: parseChemicalNumber(row.concentration_value),
    absorbance: parseChemicalNumber(row.absorbance),
    generatedAt: row.generated_at,
    generatedByName: row.owner_full_name,
    generatedByUserId: row.owner_user_identifier,
    createdAt: row.created_at,
    owner: {
      id: Number(row.owner_user_id),
      userId: row.owner_user_identifier,
      fullName: row.owner_full_name
    }
  };
}

export async function createReport(input: CreateReportInput) {
  await initializeReportsSchema();
  const result = await pool.query<ReportRow>(insertReportQuery, [
    input.reportId,
    input.projectId,
    input.projectName,
    input.ownerUserId,
    input.ownerUserIdentifier,
    input.ownerFullName,
    input.compoundName,
    input.casId,
    input.lambdaMax,
    input.solvent,
    input.source,
    input.epsilonValue,
    input.pathLengthValue,
    input.concentrationValue,
    input.absorbance,
    input.generatedAt
  ]);

  return mapReportRow(result.rows[0]);
}

type StoredReport = ReturnType<typeof mapReportRow>;

function normalizeProjectLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getReportIdentity(report: StoredReport) {
  if (report.projectName || report.projectId) {
    const [, ...rawAnalysisParts] = report.compoundName.split(' - ');
    return {
      compound: report.projectName || report.projectId || 'Project',
      analysis: rawAnalysisParts.join(' - ').trim() || report.compoundName || report.source || 'Analytical report'
    };
  }

  const [rawCompound, ...rawAnalysisParts] = report.compoundName.split(' - ');
  const compound = rawCompound?.trim() || report.compoundName || 'Not identified';
  const analysis = rawAnalysisParts.join(' - ').trim() || report.source || 'Analytical report';

  return {
    compound,
    analysis
  };
}

function getDashboardProjectKey(report: StoredReport) {
  const identity = getReportIdentity(report);
  const normalizedProject = normalizeProjectLabel(identity.compound);

  return report.projectId || (report.casId && report.casId !== 'N/A' ? report.casId : normalizedProject || identity.compound);
}

function getReportsProjectKey(report: StoredReport) {
  if (report.projectId || report.projectName) {
    const label = report.projectName || report.projectId || 'Project';
    return report.projectId || normalizeProjectLabel(label);
  }

  const [rawProject] = report.compoundName.split(' - ');
  const label = rawProject?.trim() || report.compoundName || 'Not identified';

  return report.casId && report.casId !== 'N/A'
    ? report.casId
    : normalizeProjectLabel(label) || label;
}

export async function listReports(ownerUserId: number, isAdmin: boolean, search: string) {
  await initializeReportsSchema();
  const result = await pool.query<ReportRow>(listReportsQuery, [isAdmin, ownerUserId, toLikePattern(search)]);
  return result.rows.map(mapReportRow);
}

export async function deleteReportsByProjectKeys(projectKeys: string[], ownerUserId: number, isAdmin: boolean) {
  await initializeReportsSchema();
  const normalizedProjectKeys = new Set(
    projectKeys
      .map((projectKey) => projectKey.trim())
      .filter(Boolean)
      .flatMap((projectKey) => [projectKey, normalizeProjectLabel(projectKey)])
      .filter(Boolean)
  );

  if (!normalizedProjectKeys.size) {
    return 0;
  }

  const result = await pool.query<ReportRow>(`
    SELECT
      id,
      report_id,
      project_id,
      project_name,
      owner_user_id,
      owner_user_identifier,
      owner_full_name,
      compound_name,
      cas_id,
      lambda_max,
      solvent,
      source,
      epsilon_value,
      path_length_value,
      concentration_value,
      absorbance,
      generated_at,
      created_at
    FROM reports
    WHERE ($1::boolean = true OR owner_user_id = $2)
    ORDER BY created_at DESC, id DESC;
  `, [isAdmin, ownerUserId]);

  const reportIds = result.rows
    .map(mapReportRow)
    .filter((report) => {
      const candidateKeys = [
        getDashboardProjectKey(report),
        getReportsProjectKey(report),
        report.projectId ?? '',
        report.projectName ?? '',
        report.casId ?? '',
        getReportIdentity(report).compound
      ].flatMap((candidateKey) => [candidateKey, normalizeProjectLabel(candidateKey)]).filter(Boolean);

      return candidateKeys.some((candidateKey) => normalizedProjectKeys.has(candidateKey));
    })
    .map((report) => report.id);

  if (!reportIds.length) {
    return 0;
  }

  const deleteResult = await pool.query<{ id: number }>(
    'DELETE FROM reports WHERE id = ANY($1::bigint[]) RETURNING id;',
    [reportIds]
  );

  return deleteResult.rowCount ?? 0;
}
