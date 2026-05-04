import { pool } from '../db.ts';
import type { CreateReportInput, ReportRow } from '../types/reports.ts';
import { parseChemicalNumber } from '../utils/chemistry.ts';
import { toLikePattern } from '../utils/http.ts';

let schemaReadyPromise: Promise<void> | null = null;

const listReportsQuery = `
  SELECT
    id,
    report_id,
    owner_user_id,
    owner_user_identifier,
    owner_full_name,
    compound_name,
    cas_id,
    lambda_max,
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
    AND ($3 = '' OR report_id ILIKE $3 OR compound_name ILIKE $3 OR cas_id ILIKE $3)
  ORDER BY created_at DESC, id DESC
  LIMIT 500;
`;

const insertReportQuery = `
  INSERT INTO reports (
    report_id,
    owner_user_id,
    owner_user_identifier,
    owner_full_name,
    compound_name,
    cas_id,
    lambda_max,
    source,
    epsilon_value,
    path_length_value,
    concentration_value,
    absorbance,
    generated_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  RETURNING
    id,
    report_id,
    owner_user_id,
    owner_user_identifier,
    owner_full_name,
    compound_name,
    cas_id,
    lambda_max,
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
      owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_user_identifier VARCHAR(100) NOT NULL,
      owner_full_name VARCHAR(160) NOT NULL,
      compound_name VARCHAR(255) NOT NULL,
      cas_id VARCHAR(100) NOT NULL,
      lambda_max VARCHAR(100) NOT NULL,
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
    compoundName: row.compound_name,
    casId: row.cas_id,
    lambdaMax: row.lambda_max,
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
    input.ownerUserId,
    input.ownerUserIdentifier,
    input.ownerFullName,
    input.compoundName,
    input.casId,
    input.lambdaMax,
    input.source,
    input.epsilonValue,
    input.pathLengthValue,
    input.concentrationValue,
    input.absorbance,
    input.generatedAt
  ]);

  return mapReportRow(result.rows[0]);
}

export async function listReports(ownerUserId: number, isAdmin: boolean, search: string) {
  await initializeReportsSchema();
  const result = await pool.query<ReportRow>(listReportsQuery, [isAdmin, ownerUserId, toLikePattern(search)]);
  return result.rows.map(mapReportRow);
}
