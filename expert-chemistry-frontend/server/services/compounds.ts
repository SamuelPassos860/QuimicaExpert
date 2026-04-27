import { pool } from '../db.ts';
import type { CompoundRow, CompoundUpsertInput } from '../types/chemistry.ts';
import { parseChemicalNumber } from '../utils/chemistry.ts';
import { toLikePattern } from '../utils/http.ts';

const listCompoundsQuery = `
  SELECT cas, nome, epsilon_m_cm, lambda_max, fonte
  FROM compounds
  WHERE ($1 = '' OR cas ILIKE $1 OR nome ILIKE $1)
  ORDER BY nome ASC
  LIMIT 250;
`;

const upsertCompoundQuery = `
  INSERT INTO compounds (cas, nome, epsilon_m_cm, lambda_max, fonte)
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (cas)
  DO UPDATE SET
    nome = EXCLUDED.nome,
    epsilon_m_cm = EXCLUDED.epsilon_m_cm,
    lambda_max = EXCLUDED.lambda_max,
    fonte = EXCLUDED.fonte
  RETURNING cas, nome, epsilon_m_cm, lambda_max, fonte;
`;

function mapCompoundRow(row: CompoundRow) {
  return {
    ...row,
    epsilon_m_cm: parseChemicalNumber(row.epsilon_m_cm)
  };
}

export async function listCompounds(search: string) {
  const result = await pool.query<CompoundRow>(listCompoundsQuery, [toLikePattern(search)]);
  return result.rows.map(mapCompoundRow);
}

export async function saveCompound(input: CompoundUpsertInput) {
  const result = await pool.query<CompoundRow>(upsertCompoundQuery, [
    input.cas,
    input.nome,
    input.epsilon_m_cm,
    input.lambda_max,
    input.fonte
  ]);

  return mapCompoundRow(result.rows[0]);
}
