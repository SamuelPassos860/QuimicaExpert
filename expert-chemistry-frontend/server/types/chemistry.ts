export interface CompoundRow {
  cas: string;
  nome: string;
  epsilon_m_cm: string | number | null;
  lambda_max: string | null;
  solvent: string | null;
  fonte: string | null;
  path_length_cm: string | number | null;
  concentration_mol_l: string | number | null;
  absorbance: string | number | null;
  saved_at: string | null;
}

export interface CompoundDeleteTarget {
  cas: string;
  nome: string;
}

export interface SpectralRow {
  compound_name: string;
  absorption_wavelength_nm: string | number | null;
  molar_extinction_coefficient: string | number | null;
  absorption_solvent: string | null;
  structure_file: string | null;
}

export interface SpectralPoint {
  wavelengthNm: number;
  absorbance: number | null;
  transmittance: number | null;
}

export interface SpectrophotometerPayload {
  rawText?: string;
  data?: string;
  fileName?: string;
  instrumentName?: string;
  parserName?: string;
  compoundName?: string;
  cas?: string;
  solvent?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  points?: Array<{
    wavelengthNm?: number | string;
    wavelength_nm?: number | string;
    wavelength?: number | string;
    absorbance?: number | string | null;
    transmittance?: number | string | null;
  }>;
}

export interface ParsedSpectrophotometerRun {
  fileName: string | null;
  instrumentName: string;
  parserName: string;
  compoundName: string | null;
  cas: string | null;
  solvent: string | null;
  source: string;
  metadata: Record<string, unknown>;
  points: SpectralPoint[];
  peakWavelengthNm: number | null;
  peakAbsorbance: number | null;
  minWavelengthNm: number | null;
  maxWavelengthNm: number | null;
}

export interface SpectrophotometerRunRow {
  id: string | number;
  file_name: string | null;
  instrument_name: string;
  parser_name: string;
  compound_name: string | null;
  cas: string | null;
  solvent: string | null;
  source: string;
  peak_wavelength_nm: string | number | null;
  peak_absorbance: string | number | null;
  min_wavelength_nm: string | number | null;
  max_wavelength_nm: string | number | null;
  points: SpectralPoint[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CompoundUpsertBody {
  cas?: string;
  nome?: string;
  epsilon_m_cm?: number | string | null;
  lambda_max?: string | null;
  solvent?: string | null;
  fonte?: string | null;
  path_length_cm?: number | string | null;
  concentration_mol_l?: number | string | null;
  absorbance?: number | string | null;
}

export interface CompoundUpsertInput {
  cas: string;
  nome: string;
  epsilon_m_cm: number;
  lambda_max: string;
  solvent: string;
  fonte: string;
  path_length_cm: number;
  concentration_mol_l: number;
  absorbance: number;
}
