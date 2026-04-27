import { pool } from '../db.ts';
import type { SpectralRow } from '../types/chemistry.ts';
import { parseChemicalNumber } from '../utils/chemistry.ts';
import { toLikePattern } from '../utils/http.ts';

const listSpectralDataQuery = `
  SELECT compound_name, absorption_wavelength_nm, molar_extinction_coefficient
  FROM spectral_data
  WHERE molar_extinction_coefficient IS NOT NULL
    AND compound_name IS NOT NULL
    AND ($1 = '' OR compound_name ILIKE $1)
  ORDER BY compound_name ASC
  LIMIT 250;
`;

export async function listSpectralData(search: string) {
  const result = await pool.query<SpectralRow>(listSpectralDataQuery, [toLikePattern(search)]);

  return result.rows
    .map((row) => ({
      ...row,
      molar_extinction_coefficient: parseChemicalNumber(row.molar_extinction_coefficient)
    }))
    .filter((row) => row.molar_extinction_coefficient !== null);
}
