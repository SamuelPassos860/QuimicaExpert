export interface CompoundRow {
  cas: string;
  nome: string;
  epsilon_m_cm: string | number | null;
  lambda_max: string | null;
  fonte: string | null;
}

export interface SpectralRow {
  compound_name: string;
  absorption_wavelength_nm: string | number | null;
  molar_extinction_coefficient: string | number | null;
}

export interface CompoundUpsertBody {
  cas?: string;
  nome?: string;
  epsilon_m_cm?: number | string | null;
  lambda_max?: string | null;
  fonte?: string | null;
}

export interface CompoundUpsertInput {
  cas: string;
  nome: string;
  epsilon_m_cm: number;
  lambda_max: string;
  fonte: string;
}
