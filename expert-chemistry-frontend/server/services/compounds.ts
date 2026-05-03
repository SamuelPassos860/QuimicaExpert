import { pool } from '../db.ts';
import type { CompoundRow, CompoundUpsertInput } from '../types/chemistry.ts';
import { parseChemicalNumber } from '../utils/chemistry.ts';
import { toLikePattern } from '../utils/http.ts';

let schemaReadyPromise: Promise<void> | null = null;

const listCompoundsQuery = `
  SELECT cas, nome, epsilon_m_cm, lambda_max, fonte, path_length_cm, concentration_mol_l, absorbance, saved_at
  FROM compounds
  WHERE ($1 = '' OR cas ILIKE $1 OR nome ILIKE $1)
  ORDER BY saved_at DESC NULLS LAST, nome ASC
  LIMIT 500;
`;

const upsertCompoundQuery = `
  INSERT INTO compounds (cas, nome, epsilon_m_cm, lambda_max, fonte, path_length_cm, concentration_mol_l, absorbance, saved_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  ON CONFLICT (cas)
  DO UPDATE SET
    nome = EXCLUDED.nome,
    epsilon_m_cm = EXCLUDED.epsilon_m_cm,
    lambda_max = EXCLUDED.lambda_max,
    fonte = EXCLUDED.fonte,
    path_length_cm = EXCLUDED.path_length_cm,
    concentration_mol_l = EXCLUDED.concentration_mol_l,
    absorbance = EXCLUDED.absorbance,
    saved_at = NOW()
  RETURNING cas, nome, epsilon_m_cm, lambda_max, fonte, path_length_cm, concentration_mol_l, absorbance, saved_at;
`;

const deleteCompoundQuery = `
  DELETE FROM compounds
  WHERE cas = $1
`;

async function ensureCompoundsSchema() {
  await pool.query(`
    ALTER TABLE compounds
    ADD COLUMN IF NOT EXISTS path_length_cm DOUBLE PRECISION NOT NULL DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE compounds
    ADD COLUMN IF NOT EXISTS concentration_mol_l DOUBLE PRECISION NOT NULL DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE compounds
    ADD COLUMN IF NOT EXISTS absorbance DOUBLE PRECISION NOT NULL DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE compounds
    ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
}

async function initializeCompoundsSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureCompoundsSchema();
  }

  await schemaReadyPromise;
}

function mapCompoundRow(row: CompoundRow) {
  return {
    ...row,
    epsilon_m_cm: parseChemicalNumber(row.epsilon_m_cm),
    path_length_cm: parseChemicalNumber(row.path_length_cm),
    concentration_mol_l: parseChemicalNumber(row.concentration_mol_l),
    absorbance: parseChemicalNumber(row.absorbance)
  };
}

export async function listCompounds(search: string) {
  await initializeCompoundsSchema();
  const result = await pool.query<CompoundRow>(listCompoundsQuery, [toLikePattern(search)]);
  return result.rows.map(mapCompoundRow);
}

export async function saveCompound(input: CompoundUpsertInput) {
  await initializeCompoundsSchema();
  const result = await pool.query<CompoundRow>(upsertCompoundQuery, [
    input.cas,
    input.nome,
    input.epsilon_m_cm,
    input.lambda_max,
    input.fonte,
    input.path_length_cm,
    input.concentration_mol_l,
    input.absorbance
  ]);

  return mapCompoundRow(result.rows[0]);
}

export async function deleteCompound(cas: string) {
  await initializeCompoundsSchema();
  const result = await pool.query(deleteCompoundQuery, [cas]);
  return result.rowCount > 0;
}
