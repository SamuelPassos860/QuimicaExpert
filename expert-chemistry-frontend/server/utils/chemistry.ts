export function parseChemicalNumber(value: string | number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  let normalized = value.trim().replaceAll('"', '');

  if (!normalized) {
    return null;
  }

  if (normalized.includes('.') && normalized.includes(',')) {
    normalized = normalized.replaceAll('.', '').replaceAll(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replaceAll(',', '.');
  }

  normalized = normalized.replace(/\s+/g, '');

  const scientificMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)x10\^([+-]?\d+)$/i);
  if (scientificMatch) {
    const base = Number(scientificMatch[1]);
    const exponent = Number(scientificMatch[2]);

    if (Number.isFinite(base) && Number.isFinite(exponent)) {
      return base * 10 ** exponent;
    }
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}
