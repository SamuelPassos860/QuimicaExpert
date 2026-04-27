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

  if (!nome) {
    return { error: 'nome is required.' };
  }

  if (Number.isNaN(epsilon_m_cm)) {
    return { error: 'epsilon_m_cm must be numeric.' };
  }

  return {
    data: {
      cas,
      nome,
      epsilon_m_cm,
      lambda_max,
      fonte
    }
  };
}
