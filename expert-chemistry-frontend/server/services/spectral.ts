import { pool } from '../db.ts';
import type { SpectralRow } from '../types/chemistry.ts';
import { parseChemicalNumber } from '../utils/chemistry.ts';
import { toLikePattern } from '../utils/http.ts';

const listSpectralDataQuery = `
  SELECT compound_name, absorption_wavelength_nm, molar_extinction_coefficient, structure_file
  FROM spectral_data
  WHERE molar_extinction_coefficient IS NOT NULL
    AND compound_name IS NOT NULL
    AND ($1 = '' OR compound_name ILIKE $1 OR structure_file ILIKE $1)
  ORDER BY compound_name ASC
  LIMIT 500;
`;

function extractCasFromStructureFile(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d{1,7}-\d{2}-\d)/);
  return match?.[1] || null;
}

export async function listSpectralData(search: string) {
  const result = await pool.query<SpectralRow>(listSpectralDataQuery, [toLikePattern(search)]);

  return result.rows
    .map((row) => ({
      ...row,
      molar_extinction_coefficient: parseChemicalNumber(row.molar_extinction_coefficient),
      cas: extractCasFromStructureFile(row.structure_file)
    }))
    .filter((row) => row.molar_extinction_coefficient !== null);
}
