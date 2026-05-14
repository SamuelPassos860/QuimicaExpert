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
