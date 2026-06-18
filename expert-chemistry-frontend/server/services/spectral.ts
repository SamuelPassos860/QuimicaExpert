import { pool } from '../db.js';
import type {
  ParsedSpectrophotometerRun,
  SpectralPoint,
  SpectralRow,
  SpectrophotometerPayload,
  SpectrophotometerRunRow
} from '../types/chemistry.js';
import { parseChemicalNumber } from '../utils/chemistry.js';
import { toLikePattern } from '../utils/http.js';

let spectrophotometerSchemaReadyPromise: Promise<void> | null = null;

const listSpectralDataQuery = `
  SELECT compound_name, absorption_wavelength_nm, molar_extinction_coefficient, absorption_solvent, structure_file
  FROM spectral_data
  WHERE molar_extinction_coefficient IS NOT NULL
    AND compound_name IS NOT NULL
    AND ($1 = '' OR compound_name ILIKE $1 OR structure_file ILIKE $1)
  ORDER BY compound_name ASC
  LIMIT 500;
`;

const insertSpectrophotometerRunQuery = `
  INSERT INTO spectrophotometer_runs (
    file_name,
    instrument_name,
    parser_name,
    compound_name,
    cas,
    solvent,
    source,
    peak_wavelength_nm,
    peak_absorbance,
    min_wavelength_nm,
    max_wavelength_nm,
    points,
    metadata,
    raw_text
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14)
  RETURNING
    id,
    file_name,
    instrument_name,
    parser_name,
    compound_name,
    cas,
    solvent,
    source,
    peak_wavelength_nm,
    peak_absorbance,
    min_wavelength_nm,
    max_wavelength_nm,
    points,
    metadata,
    created_at;
`;

const listSpectrophotometerRunsQuery = `
  SELECT
    id,
    file_name,
    instrument_name,
    parser_name,
    compound_name,
    cas,
    solvent,
    source,
    peak_wavelength_nm,
    peak_absorbance,
    min_wavelength_nm,
    max_wavelength_nm,
    points,
    metadata,
    created_at
  FROM spectrophotometer_runs
  WHERE (
    $1 = ''
    OR file_name ILIKE $1
    OR instrument_name ILIKE $1
    OR parser_name ILIKE $1
    OR compound_name ILIKE $1
    OR cas ILIKE $1
    OR solvent ILIKE $1
  )
  ORDER BY created_at DESC
  LIMIT $2;
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

async function ensureSpectrophotometerRunsSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS spectrophotometer_runs (
      id BIGSERIAL PRIMARY KEY,
      file_name VARCHAR(260) NULL,
      instrument_name VARCHAR(160) NOT NULL DEFAULT 'Unknown spectrophotometer',
      parser_name VARCHAR(120) NOT NULL DEFAULT 'auto',
      compound_name VARCHAR(260) NULL,
      cas VARCHAR(40) NULL,
      solvent VARCHAR(160) NULL,
      source VARCHAR(120) NOT NULL DEFAULT 'Instrument',
      peak_wavelength_nm DOUBLE PRECISION NULL,
      peak_absorbance DOUBLE PRECISION NULL,
      min_wavelength_nm DOUBLE PRECISION NULL,
      max_wavelength_nm DOUBLE PRECISION NULL,
      points JSONB NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      raw_text TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS spectrophotometer_runs_created_at_idx
    ON spectrophotometer_runs (created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS spectrophotometer_runs_lookup_idx
    ON spectrophotometer_runs (compound_name, cas)
  `);
}

async function initializeSpectrophotometerRunsSchema() {
  if (!spectrophotometerSchemaReadyPromise) {
    spectrophotometerSchemaReadyPromise = ensureSpectrophotometerRunsSchema();
  }

  await spectrophotometerSchemaReadyPromise;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableString(value: unknown) {
  const text = asString(value);
  return text || null;
}

function normalizeRawText(payload: SpectrophotometerPayload) {
  return asString(payload.rawText) || asString(payload.data);
}

function splitDataLine(line: string) {
  const trimmed = line.trim();

  if (trimmed.includes('\t')) {
    return trimmed.split('\t').map((part) => part.trim()).filter(Boolean);
  }

  if (trimmed.includes(';')) {
    return trimmed.split(';').map((part) => part.trim()).filter(Boolean);
  }

  if (trimmed.includes(',') && !/^\s*[+-]?\d+,\d+\s+[+-]?\d+,\d+\s*$/.test(trimmed)) {
    return trimmed.split(',').map((part) => part.trim()).filter(Boolean);
  }

  return trimmed.split(/\s+/).map((part) => part.trim()).filter(Boolean);
}

function parsePointNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  return parseChemicalNumber(value.replace(/[^\d,+\-.eExX^]/g, ''));
}

function normalizeTransmittance(value: number | null) {
  if (value === null || value <= 0) {
    return null;
  }

  return value > 1 ? value / 100 : value;
}

function absorbanceFromTransmittance(value: number | null) {
  const normalized = normalizeTransmittance(value);
  return normalized && normalized > 0 ? -Math.log10(normalized) : null;
}

function parsePointFromObject(point: NonNullable<SpectrophotometerPayload['points']>[number]) {
  const wavelengthNm = parsePointNumber(point.wavelengthNm ?? point.wavelength_nm ?? point.wavelength);
  const explicitAbsorbance = parsePointNumber(point.absorbance ?? null);
  const transmittance = parsePointNumber(point.transmittance ?? null);
  const absorbance = explicitAbsorbance ?? absorbanceFromTransmittance(transmittance);

  if (wavelengthNm === null || (absorbance === null && transmittance === null)) {
    return null;
  }

  return {
    wavelengthNm,
    absorbance,
    transmittance
  };
}

function getHeaderColumns(parts: string[]) {
  const normalized = parts.map((part) => part.toLowerCase().replace(/[^a-z0-9%]+/g, ''));
  const wavelengthIndex = normalized.findIndex((part) => part.includes('wavelength') || part === 'nm' || part.includes('lambda'));
  const absorbanceIndex = normalized.findIndex((part) => part.includes('absorbance') || part === 'abs' || part === 'a');
  const transmittanceIndex = normalized.findIndex((part) => part.includes('transmittance') || part.includes('transmit') || part === 't' || part === '%t');

  if (wavelengthIndex === -1 || (absorbanceIndex === -1 && transmittanceIndex === -1)) {
    return null;
  }

  return {
    wavelengthIndex,
    absorbanceIndex,
    transmittanceIndex
  };
}

function parsePointsFromText(rawText: string) {
  const points: SpectralPoint[] = [];
  const metadata: Record<string, unknown> = {};
  let columns: ReturnType<typeof getHeaderColumns> = null;

  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    const keyValueMatch = trimmed.match(/^([^:=]{2,60})\s*[:=]\s*(.+)$/);
    if (keyValueMatch && !/\d/.test(keyValueMatch[1])) {
      metadata[keyValueMatch[1].trim()] = keyValueMatch[2].trim();
      continue;
    }

    const parts = splitDataLine(trimmed);
    const header = getHeaderColumns(parts);

    if (header) {
      columns = header;
      continue;
    }

    const wavelength = columns
      ? parsePointNumber(parts[columns.wavelengthIndex])
      : parsePointNumber(parts[0]);
    const absorbance = columns && columns.absorbanceIndex !== -1
      ? parsePointNumber(parts[columns.absorbanceIndex])
      : parsePointNumber(parts[1]);
    const transmittance = columns && columns.transmittanceIndex !== -1
      ? parsePointNumber(parts[columns.transmittanceIndex])
      : null;
    const effectiveAbsorbance = absorbance ?? absorbanceFromTransmittance(transmittance);

    if (wavelength !== null && (effectiveAbsorbance !== null || transmittance !== null)) {
      points.push({
        wavelengthNm: wavelength,
        absorbance: effectiveAbsorbance,
        transmittance
      });
    }
  }

  return { points, metadata };
}

function summarizePoints(points: SpectralPoint[]) {
  let peakWavelengthNm: number | null = null;
  let peakAbsorbance: number | null = null;
  let minWavelengthNm: number | null = null;
  let maxWavelengthNm: number | null = null;

  for (const point of points) {
    minWavelengthNm = minWavelengthNm === null ? point.wavelengthNm : Math.min(minWavelengthNm, point.wavelengthNm);
    maxWavelengthNm = maxWavelengthNm === null ? point.wavelengthNm : Math.max(maxWavelengthNm, point.wavelengthNm);

    if (point.absorbance !== null && (peakAbsorbance === null || point.absorbance > peakAbsorbance)) {
      peakAbsorbance = point.absorbance;
      peakWavelengthNm = point.wavelengthNm;
    }
  }

  return {
    peakWavelengthNm,
    peakAbsorbance,
    minWavelengthNm,
    maxWavelengthNm
  };
}

function mapSpectrophotometerRunRow(row: SpectrophotometerRunRow) {
  return {
    id: String(row.id),
    fileName: row.file_name,
    instrumentName: row.instrument_name,
    parserName: row.parser_name,
    compoundName: row.compound_name,
    cas: row.cas,
    solvent: row.solvent,
    source: row.source,
    peakWavelengthNm: parseChemicalNumber(row.peak_wavelength_nm),
    peakAbsorbance: parseChemicalNumber(row.peak_absorbance),
    minWavelengthNm: parseChemicalNumber(row.min_wavelength_nm),
    maxWavelengthNm: parseChemicalNumber(row.max_wavelength_nm),
    points: row.points || [],
    metadata: row.metadata || {},
    createdAt: row.created_at
  };
}

export function parseSpectrophotometerPayload(payload: SpectrophotometerPayload): ParsedSpectrophotometerRun {
  const rawText = normalizeRawText(payload);
  const textResult = rawText ? parsePointsFromText(rawText) : { points: [], metadata: {} };
  const structuredPoints = Array.isArray(payload.points)
    ? payload.points.map(parsePointFromObject).filter((point): point is SpectralPoint => point !== null)
    : [];
  const points = structuredPoints.length > 0 ? structuredPoints : textResult.points;

  if (points.length === 0) {
    throw new Error('No spectral points were found in the spectrophotometer payload.');
  }

  const metadata = {
    ...textResult.metadata,
    ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {})
  };

  return {
    fileName: nullableString(payload.fileName),
    instrumentName: asString(payload.instrumentName) || 'Unknown spectrophotometer',
    parserName: asString(payload.parserName) || 'auto',
    compoundName: nullableString(payload.compoundName),
    cas: nullableString(payload.cas),
    solvent: nullableString(payload.solvent),
    source: asString(payload.source) || 'Instrument',
    metadata,
    points,
    ...summarizePoints(points)
  };
}

export async function saveSpectrophotometerRun(payload: SpectrophotometerPayload) {
  await initializeSpectrophotometerRunsSchema();

  const parsed = parseSpectrophotometerPayload(payload);
  const rawText = normalizeRawText(payload) || null;
  const result = await pool.query<SpectrophotometerRunRow>(insertSpectrophotometerRunQuery, [
    parsed.fileName,
    parsed.instrumentName,
    parsed.parserName,
    parsed.compoundName,
    parsed.cas,
    parsed.solvent,
    parsed.source,
    parsed.peakWavelengthNm,
    parsed.peakAbsorbance,
    parsed.minWavelengthNm,
    parsed.maxWavelengthNm,
    JSON.stringify(parsed.points),
    JSON.stringify(parsed.metadata),
    rawText
  ]);

  return mapSpectrophotometerRunRow(result.rows[0]!);
}

export async function listSpectrophotometerRuns(search: string, limit = 50) {
  await initializeSpectrophotometerRunsSchema();
  const normalizedLimit = Math.min(Math.max(limit, 1), 100);
  const result = await pool.query<SpectrophotometerRunRow>(listSpectrophotometerRunsQuery, [
    toLikePattern(search),
    normalizedLimit
  ]);

  return result.rows.map(mapSpectrophotometerRunRow);
}
