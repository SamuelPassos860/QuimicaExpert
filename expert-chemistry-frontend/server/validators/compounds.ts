import type { CompoundUpsertBody, CompoundUpsertInput } from '../types/chemistry.ts';

interface ValidationResult {
  data?: CompoundUpsertInput;
  error?: string;
}

export function validateCompoundUpsert(body: CompoundUpsertBody): ValidationResult {
  const nome = body.nome?.trim();
  const cas = body.cas?.trim() || 'S/CAS';
  const lambda_max = body.lambda_max?.trim() || 'N/A';
  const fonte = body.fonte?.trim() || 'Manual';
  const epsilon_m_cm = Number(body.epsilon_m_cm ?? 0);
  const path_length_cm = Number(body.path_length_cm ?? 0);
  const concentration_mol_l = Number(body.concentration_mol_l ?? 0);
  const absorbance = Number(body.absorbance ?? 0);

  if (!nome) {
    return { error: 'nome is required.' };
  }

  if (Number.isNaN(epsilon_m_cm)) {
    return { error: 'epsilon_m_cm must be numeric.' };
  }

  if (Number.isNaN(path_length_cm)) {
    return { error: 'path_length_cm must be numeric.' };
  }

  if (Number.isNaN(concentration_mol_l)) {
    return { error: 'concentration_mol_l must be numeric.' };
  }

  if (Number.isNaN(absorbance)) {
    return { error: 'absorbance must be numeric.' };
  }

  return {
    data: {
      cas,
      nome,
      epsilon_m_cm,
      lambda_max,
      fonte,
      path_length_cm,
      concentration_mol_l,
      absorbance
    }
  };
}
