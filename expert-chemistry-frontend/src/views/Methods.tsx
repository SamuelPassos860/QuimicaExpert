import { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Calculator, Copy, Sigma, Waves, Link, Unlink, FileUp, RotateCcw, TrendingUp, Plus, Trash2, CheckCircle2, Circle, Download, Sparkles, FlaskConical, Search } from 'lucide-react';
import type { AuthUser } from '../types/auth';
import type { AnalysisAuditPayload } from '../types/audit';
import { useLanguage } from '../i18n';
import { buildReportPayload, openPrintableReport } from '../utils/reportExport';

type MethodTab = 'lambert-beer' | 'linear-regression';
type ProjectMethodType = 'direct-proportion' | 'blank-correction' | 'transmittance-absorbance' | 'calibration-curve' | 'custom-formula';
type MethodInputKey = 'sampleAbsorbance' | 'standardAbsorbance' | 'standardConcentration' | 'concentrationUnit' | 'blankAbsorbance' | 'transmittance';
type ProjectReadingTarget = MethodInputKey | `custom:${string}`;

const createAnalysisRunId = () => `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface FormulaConstant {
  name: string;
  value: number;
}

interface ProjectMethod {
  id: string;
  name: string;
  expression: string;
  type: ProjectMethodType;
  tab?: MethodTab;
  constants?: FormulaConstant[];
  resultUnit?: string;
}

interface AnalyticalProject {
  id: string;
  compound: string;
  matrix: string;
  wavelength: string;
  description: string;
  inputs: string[];
  methods: ProjectMethod[];
}

const METHODS_STORAGE_VERSION = 1;
const METHODS_STORAGE_PREFIX = 'quimicaexpert:methods:';

const initialProjectLibrary: AnalyticalProject[] = [
  {
    id: 'PRJ-CAF',
    compound: 'Caffeine',
    matrix: 'Beverages and extracts',
    wavelength: '273 nm',
    description: 'Project for quantifying caffeine by UV reading using a known standard, sample absorbance and dilution factor.',
    inputs: ['Standard absorbance', 'Standard concentration', 'Sample absorbance', 'Dilution'],
    methods: [
      { id: 'MTD-CAF-01', name: 'Direct proportion', expression: 'C sample = (A sample x C standard) / A standard', type: 'direct-proportion', tab: 'linear-regression' as const },
      { id: 'MTD-CAF-02', name: 'Calibration curve', expression: 'y = mx + b; x = (y - b) / m', type: 'calibration-curve', tab: 'linear-regression' as const }
    ]
  },
  {
    id: 'PRJ-FE',
    compound: 'Total iron',
    matrix: 'Water and effluents',
    wavelength: '510 nm',
    description: 'Project for colorimetric methods with blank correction, analytical curve and corrected absorbance reading.',
    inputs: ['Blank absorbance', 'Sample absorbance', 'Curve points', 'Final volume'],
    methods: [
      { id: 'MTD-FE-01', name: 'Corrected absorbance', expression: 'A corrected = A sample - A blank', type: 'blank-correction', tab: 'lambert-beer' as const },
      { id: 'MTD-FE-02', name: 'Linear regression', expression: 'Concentration = (A corrected - b) / m', type: 'calibration-curve', tab: 'linear-regression' as const }
    ]
  },
  {
    id: 'PRJ-DYE',
    compound: 'Blue dye',
    matrix: 'Finished product',
    wavelength: '620 nm',
    description: 'Project for a simple standard-to-sample comparison with transmittance converted into absorbance.',
    inputs: ['Transmittance', 'Calculated absorbance', 'Nominal concentration', 'Wavelength'],
    methods: [
      { id: 'MTD-DYE-01', name: 'Transmittance to absorbance', expression: 'A = -log10(T / 100)', type: 'transmittance-absorbance', tab: 'lambert-beer' as const },
      { id: 'MTD-DYE-02', name: 'Standard/sample proportion', expression: 'C sample = C standard x A sample / A standard', type: 'direct-proportion', tab: 'linear-regression' as const }
    ]
  }
];

const projectMethodTypes: ProjectMethodType[] = [
  'direct-proportion',
  'blank-correction',
  'transmittance-absorbance',
  'calibration-curve',
  'custom-formula'
];

const methodTabs: MethodTab[] = ['lambert-beer', 'linear-regression'];

function cloneInitialProjects() {
  return initialProjectLibrary.map((project) => ({
    ...project,
    inputs: [...project.inputs],
    methods: project.methods.map((method) => ({
      ...method,
      constants: method.constants ? [...method.constants] : undefined,
      resultUnit: method.resultUnit
    }))
  }));
}

function getMethodsStorageKey(currentUser: AuthUser) {
  return `quimicaexpert:methods:v${METHODS_STORAGE_VERSION}:${currentUser.id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeFormulaConstants(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const constants = value
    .filter(isRecord)
    .map((constant) => ({
      name: typeof constant.name === 'string' ? constant.name : '',
      value: typeof constant.value === 'number' && Number.isFinite(constant.value) ? constant.value : Number.NaN
    }))
    .filter((constant) => constant.name && Number.isFinite(constant.value));

  return constants.length ? constants : undefined;
}

function normalizeSavedMethod(value: unknown): ProjectMethod | null {
  if (!isRecord(value)) return null;

  const type = value.type;
  const tab = value.tab;

  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.expression !== 'string' ||
    !projectMethodTypes.includes(type as ProjectMethodType)
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    expression: value.expression,
    type: type as ProjectMethodType,
    tab: methodTabs.includes(tab as MethodTab) ? tab as MethodTab : undefined,
    constants: normalizeFormulaConstants(value.constants),
    resultUnit: typeof value.resultUnit === 'string' ? value.resultUnit : undefined
  };
}

function normalizeSavedProject(value: unknown): AnalyticalProject | null {
  if (!isRecord(value)) return null;

  if (
    typeof value.id !== 'string' ||
    typeof value.compound !== 'string' ||
    typeof value.matrix !== 'string' ||
    typeof value.wavelength !== 'string' ||
    typeof value.description !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    compound: value.compound,
    matrix: value.matrix,
    wavelength: value.wavelength,
    description: value.description,
    inputs: normalizeStringArray(value.inputs),
    methods: Array.isArray(value.methods)
      ? value.methods.map(normalizeSavedMethod).filter((method): method is ProjectMethod => method !== null)
      : []
  };
}

function parseStoredProjects(storedValue: string | null) {
  if (!storedValue) return [];

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;
    const storedProjects = isRecord(parsedValue) ? parsedValue.projects : parsedValue;

    if (!Array.isArray(storedProjects)) return [];

    return storedProjects
      .map(normalizeSavedProject)
      .filter((project): project is AnalyticalProject => project !== null);
  } catch (error) {
    console.warn('Failed to parse saved methods:', error);
    return [];
  }
}

function mergeProjectLists(projectLists: AnalyticalProject[][]) {
  const projectsById = new Map<string, AnalyticalProject>();

  projectLists.flat().forEach((project) => {
    if (!projectsById.has(project.id)) {
      projectsById.set(project.id, project);
    }
  });

  return Array.from(projectsById.values());
}

function loadRecoveredProjects(currentUser: AuthUser) {
  if (typeof window === 'undefined') return cloneInitialProjects();

  try {
    const currentProjects = parseStoredProjects(window.localStorage.getItem(getMethodsStorageKey(currentUser)));
    const recoveredProjectLists: AnalyticalProject[][] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key || !key.startsWith(METHODS_STORAGE_PREFIX) || key === getMethodsStorageKey(currentUser)) {
        continue;
      }

      recoveredProjectLists.push(parseStoredProjects(window.localStorage.getItem(key)));
    }

    const mergedProjects = mergeProjectLists([
      currentProjects,
      ...recoveredProjectLists,
      cloneInitialProjects()
    ]);

    return mergedProjects.length ? mergedProjects : cloneInitialProjects();
  } catch (error) {
    console.warn('Failed to load saved methods:', error);
    return cloneInitialProjects();
  }
}

function storeProjects(currentUser: AuthUser, projects: AnalyticalProject[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      getMethodsStorageKey(currentUser),
      JSON.stringify({
        version: METHODS_STORAGE_VERSION,
        savedAt: new Date().toISOString(),
        projects
      })
    );
  } catch (error) {
    console.warn('Failed to save methods:', error);
  }
}

function areProjectListsEqual(left: AnalyticalProject[], right: AnalyticalProject[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 2
  }).format(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const methodTypeOptions: { value: ProjectMethodType; label: string; expression: string }[] = [
  {
    value: 'direct-proportion',
    label: 'Rule of three',
    expression: 'C sample = (A sample x C standard) / A standard'
  },
  {
    value: 'blank-correction',
    label: 'Blank correction',
    expression: 'A corrected = A sample - A blank'
  },
  {
    value: 'transmittance-absorbance',
    label: 'Transmittance to absorbance',
    expression: 'A = -log10(T / 100)'
  },
  {
    value: 'calibration-curve',
    label: 'Calibration curve',
    expression: 'y = mx + b; x = (y - b) / m'
  },
  {
    value: 'custom-formula',
    label: 'Custom formula',
    expression: 'Define a custom equation'
  }
];

function parseDecimal(value: string) {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractEquipmentReadingValue(text: string) {
  const cleanText = text.replace(/"/g, '').trim();
  const wavelengthPair = cleanText.match(/(\d{3,4}(?:[.,]\d+)?)[,\s\t;|]+([-+]?\d+[.,]?\d*)/);

  if (wavelengthPair) {
    const wavelength = Number.parseFloat(wavelengthPair[1].replace(',', '.'));
    const reading = Number.parseFloat(wavelengthPair[2].replace(',', '.'));
    if (Number.isFinite(wavelength) && wavelength >= 190 && wavelength <= 1100 && Number.isFinite(reading) && reading < 10) {
      return wavelengthPair[2].replace(',', '.');
    }
  }

  const numericMatch = cleanText.match(/(?<!\d)[-+]?\d*[.,]?\d+(?!\d)/);
  return numericMatch ? numericMatch[0].replace(',', '.') : null;
}

function normalizeFormulaName(value: string) {
  const normalized = value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (!normalized) return '';
  return /^[A-Za-z_]/.test(normalized) ? normalized : `v_${normalized}`;
}

type FormulaToken =
  | { type: 'number'; value: number }
  | { type: 'variable'; value: string }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' | '^' | 'u-' }
  | { type: 'paren'; value: '(' | ')' };

function isFormulaVariableToken(token: FormulaToken): token is Extract<FormulaToken, { type: 'variable' }> {
  return token.type === 'variable';
}

const operatorConfig: Record<string, { precedence: number; associativity: 'left' | 'right' }> = {
  '+': { precedence: 1, associativity: 'left' },
  '-': { precedence: 1, associativity: 'left' },
  '*': { precedence: 2, associativity: 'left' },
  '/': { precedence: 2, associativity: 'left' },
  '^': { precedence: 3, associativity: 'right' },
  'u-': { precedence: 4, associativity: 'right' }
};

function getFormulaBody(expression: string) {
  const equationParts = expression.split('=');
  const rawBody = equationParts.length > 1 ? equationParts.slice(1).join('=') : expression;

  return rawBody
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+x\s+/gi, ' * ')
    .replace(/(\d),(\d)/g, '$1.$2')
    .trim();
}

function tokenizeFormula(expression: string): { tokens: FormulaToken[]; error: string | null } {
  const body = getFormulaBody(expression);
  const tokens: FormulaToken[] = [];
  let index = 0;
  let previousToken: FormulaToken | null = null;

  while (index < body.length) {
    const char = body[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/\d|\./.test(char)) {
      const match = body.slice(index).match(/^\d*\.?\d+(?:e[-+]?\d+)?/i);
      if (!match) {
        return { tokens: [], error: `Invalid number near "${body.slice(index)}".` };
      }
      const value = Number.parseFloat(match[0]);
      tokens.push({ type: 'number', value });
      previousToken = tokens[tokens.length - 1];
      index += match[0].length;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const match = body.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (!match) {
        return { tokens: [], error: `Invalid variable near "${body.slice(index)}".` };
      }
      tokens.push({ type: 'variable', value: match[0] });
      previousToken = tokens[tokens.length - 1];
      index += match[0].length;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      previousToken = tokens[tokens.length - 1];
      index += 1;
      continue;
    }

    if ('+-*/^'.includes(char)) {
      const isUnaryMinus = char === '-' && (
        previousToken === null ||
        previousToken.type === 'operator' ||
        (previousToken.type === 'paren' && previousToken.value === '(')
      );
      const operatorValue = (isUnaryMinus ? 'u-' : char) as Extract<FormulaToken, { type: 'operator' }>['value'];
      tokens.push({ type: 'operator', value: operatorValue });
      previousToken = tokens[tokens.length - 1];
      index += 1;
      continue;
    }

    return { tokens: [], error: `Unsupported symbol "${char}".` };
  }

  return { tokens, error: null };
}

function toRpn(tokens: FormulaToken[]) {
  const output: FormulaToken[] = [];
  const operators: FormulaToken[] = [];

  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'variable') {
      output.push(token);
      continue;
    }

    if (token.type === 'operator') {
      const config = operatorConfig[token.value];
      while (operators.length > 0) {
        const top = operators[operators.length - 1];
        if (top.type !== 'operator') break;

        const topConfig = operatorConfig[top.value];
        const shouldPop = config.associativity === 'left'
          ? config.precedence <= topConfig.precedence
          : config.precedence < topConfig.precedence;

        if (!shouldPop) break;
        output.push(operators.pop() as FormulaToken);
      }
      operators.push(token);
      continue;
    }

    if (token.type === 'paren' && token.value === '(') {
      operators.push(token);
      continue;
    }

    if (token.type === 'paren' && token.value === ')') {
      while (operators.length > 0 && !(operators[operators.length - 1].type === 'paren' && operators[operators.length - 1].value === '(')) {
        output.push(operators.pop() as FormulaToken);
      }

      if (operators.length === 0) {
        return { rpn: [], error: 'Mismatched parentheses.' };
      }
      operators.pop();
    }
  }

  while (operators.length > 0) {
    const token = operators.pop() as FormulaToken;
    if (token.type === 'paren') return { rpn: [], error: 'Mismatched parentheses.' };
    output.push(token);
  }

  return { rpn: output, error: null };
}

function evaluateCustomFormula(expression: string, variableValues: Record<string, string>, constants: FormulaConstant[] = []) {
  const { tokens, error: tokenError } = tokenizeFormula(expression);
  const constantMap = new Map(constants.map((constant) => [constant.name, constant.value]));
  const variableNames: string[] = [];
  for (const token of tokens) {
    if (isFormulaVariableToken(token) && !constantMap.has(token.value)) {
      variableNames.push(token.value);
    }
  }
  const variables = Array.from(new Set(variableNames));

  if (tokenError) return { variables, value: null, error: tokenError };
  if (tokens.length === 0) return { variables, value: null, error: 'Write a formula to calculate.' };

  const { rpn, error: rpnError } = toRpn(tokens);
  if (rpnError) return { variables, value: null, error: rpnError };

  const stack: number[] = [];
  for (const token of rpn) {
    if (token.type === 'number') {
      stack.push(token.value);
      continue;
    }

    if (token.type === 'variable') {
      if (constantMap.has(token.value)) {
        stack.push(constantMap.get(token.value) as number);
        continue;
      }

      const rawValue = variableValues[token.value] ?? '';
      if (rawValue.trim() === '') {
        return { variables, value: null, error: `Enter a value for ${token.value}.` };
      }
      stack.push(parseDecimal(rawValue));
      continue;
    }

    if (token.type === 'operator') {
      if (token.value === 'u-') {
        const value = stack.pop();
        if (value === undefined) return { variables, value: null, error: 'Invalid formula.' };
        stack.push(-value);
        continue;
      }

      const right = stack.pop();
      const left = stack.pop();
      if (left === undefined || right === undefined) return { variables, value: null, error: 'Invalid formula.' };

      if (token.value === '+') stack.push(left + right);
      if (token.value === '-') stack.push(left - right);
      if (token.value === '*') stack.push(left * right);
      if (token.value === '/') {
        if (right === 0) return { variables, value: null, error: 'Division by zero.' };
        stack.push(left / right);
      }
      if (token.value === '^') stack.push(left ** right);
    }
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    return { variables, value: null, error: 'Invalid result.' };
  }

  return { variables, value: stack[0], error: null };
}

function openPrintableCalibrationReport(payload: {
  currentUser: AuthUser;
  slope: number;
  intercept: number;
  r2: number;
  points: { x: number; y: number }[];
  sampleAbsorbance: number | null;
  calculatedConcentration: number | null;
  dilutionFactor: number;
}) {
  const reportWindow = window.open('', '_blank', 'width=900,height=1200');

  if (!reportWindow) {
    window.alert('Unable to open the PDF preview window. Please allow pop-ups and try again.');
    return false;
  }

  const generatedAt = new Date().toLocaleString('pt-BR');
  const equation = `y = ${payload.slope.toFixed(6)}x ${payload.intercept >= 0 ? '+' : '-'} ${Math.abs(payload.intercept).toFixed(6)}`;
  const sampleText = payload.sampleAbsorbance === null ? 'N/A' : formatNumber(payload.sampleAbsorbance);
  const concentrationText = payload.calculatedConcentration === null ? 'N/A' : `${formatNumber(payload.calculatedConcentration)} mol/L`;
  const dilutionText = `${formatNumber(payload.dilutionFactor)}x`;
  const pointRows = payload.points.map((point, index) => `
    <tr>
      <td>P${index + 1}</td>
      <td>${escapeHtml(formatNumber(point.x))}</td>
      <td>${escapeHtml(formatNumber(point.y))}</td>
    </tr>
  `).join('');
  const chartWidth = 720;
  const chartHeight = 320;
  const chartPadding = { top: 28, right: 30, bottom: 52, left: 68 };
  const xValues = payload.points.map((point) => point.x);
  const yValues = payload.points.map((point) => point.y);
  const rawMinX = Math.min(...xValues);
  const rawMaxX = Math.max(...xValues);
  const rawMinY = Math.min(...yValues);
  const rawMaxY = Math.max(...yValues);
  const xSpan = rawMaxX - rawMinX || 1;
  const ySpan = rawMaxY - rawMinY || 1;
  const minX = rawMinX - xSpan * 0.08;
  const maxX = rawMaxX + xSpan * 0.08;
  const minY = rawMinY - ySpan * 0.12;
  const maxY = rawMaxY + ySpan * 0.12;
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const scaleX = (value: number) => chartPadding.left + ((value - minX) / (maxX - minX || 1)) * plotWidth;
  const scaleY = (value: number) => chartPadding.top + plotHeight - ((value - minY) / (maxY - minY || 1)) * plotHeight;
  const lineStartY = payload.slope * minX + payload.intercept;
  const lineEndY = payload.slope * maxX + payload.intercept;
  const xTicks = Array.from({ length: 5 }, (_, index) => minX + ((maxX - minX) / 4) * index);
  const yTicks = Array.from({ length: 5 }, (_, index) => minY + ((maxY - minY) / 4) * index);
  const gridLines = [
    ...xTicks.map((tick) => {
      const x = scaleX(tick);
      return `<line x1="${x}" y1="${chartPadding.top}" x2="${x}" y2="${chartPadding.top + plotHeight}" class="grid-line" />`;
    }),
    ...yTicks.map((tick) => {
      const y = scaleY(tick);
      return `<line x1="${chartPadding.left}" y1="${y}" x2="${chartPadding.left + plotWidth}" y2="${y}" class="grid-line" />`;
    })
  ].join('');
  const xLabels = xTicks.map((tick) => {
    const x = scaleX(tick);
    return `<text x="${x}" y="${chartHeight - 22}" class="axis-label" text-anchor="middle">${escapeHtml(formatNumber(tick))}</text>`;
  }).join('');
  const yLabels = yTicks.map((tick) => {
    const y = scaleY(tick);
    return `<text x="${chartPadding.left - 12}" y="${y + 4}" class="axis-label" text-anchor="end">${escapeHtml(formatNumber(tick))}</text>`;
  }).join('');
  const chartPoints = payload.points.map((point, index) => `
    <g>
      <circle cx="${scaleX(point.x)}" cy="${scaleY(point.y)}" r="5.5" class="data-point" />
      <text x="${scaleX(point.x) + 9}" y="${scaleY(point.y) - 7}" class="point-label">P${index + 1}</text>
    </g>
  `).join('');
  const chartSvg = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Calibration curve">
      <rect x="0" y="0" width="${chartWidth}" height="${chartHeight}" class="chart-bg" />
      ${gridLines}
      <line x1="${chartPadding.left}" y1="${chartPadding.top + plotHeight}" x2="${chartPadding.left + plotWidth}" y2="${chartPadding.top + plotHeight}" class="axis-line" />
      <line x1="${chartPadding.left}" y1="${chartPadding.top}" x2="${chartPadding.left}" y2="${chartPadding.top + plotHeight}" class="axis-line" />
      <line x1="${scaleX(minX)}" y1="${scaleY(lineStartY)}" x2="${scaleX(maxX)}" y2="${scaleY(lineEndY)}" class="regression-line" />
      ${chartPoints}
      ${xLabels}
      ${yLabels}
      <text x="${chartPadding.left + plotWidth / 2}" y="${chartHeight - 6}" class="axis-title" text-anchor="middle">Concentration (X)</text>
      <text x="18" y="${chartPadding.top + plotHeight / 2}" class="axis-title" text-anchor="middle" transform="rotate(-90 18 ${chartPadding.top + plotHeight / 2})">Absorbance (Y)</text>
    </svg>
  `;

  const reportHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Linear Regression Report</title>
        <style>
          * { box-sizing: border-box; }
          html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #e9eef6; color: #0b1f44; }
          .page { width: 210mm; min-height: 297mm; max-width: 980px; margin: 30px auto; background: #ffffff; padding: 52px 60px 46px; box-shadow: 0 22px 70px rgba(15, 23, 42, 0.14); }
          .topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
          .brand { display: flex; align-items: center; gap: 16px; }
          .brand-mark { width: 56px; height: 56px; border-radius: 12px; background: #123d82; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; }
          .brand-title { margin: 0; font-size: 22px; color: #0c2d6b; }
          .brand-subtitle { margin: 6px 0 0; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #5c8de0; }
          .report-head { text-align: right; }
          .report-title { margin: 0; font-size: 22px; color: #0b2c70; line-height: 1.2; }
          .verified-pill { display: inline-flex; margin-top: 12px; padding: 6px 14px; border-radius: 999px; background: #7ce2dc; color: #0b5a63; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
          .report-id { margin: 10px 0 0; font-size: 12px; color: #52627f; }
          .divider { margin: 20px 0 36px; border: 0; border-top: 2px solid #173b79; }
          .summary-card { padding: 22px 24px; border-radius: 12px; border: 1px solid #c7d2e4; background: #eef3ff; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 28px; }
          .mini-label { margin: 0 0 8px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #68758d; font-weight: 700; }
          .mini-value { margin: 0; font-size: 17px; font-weight: 700; color: #10234d; }
          .mini-value.alt { color: #08646a; }
          .content-grid { margin-top: 34px; display: grid; grid-template-columns: 1fr 1fr; gap: 34px; }
          .section-heading { display: flex; align-items: center; gap: 14px; margin: 0 0 18px; font-size: 19px; color: #08276e; }
          .section-heading::before { content: ""; width: 4px; height: 30px; border-radius: 999px; background: #0b7a7a; }
          .details-card { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border: 1px solid #d8deea; border-radius: 10px; overflow: hidden; background: #ffffff; }
          .details-cell { padding: 12px 16px 14px; border-right: 1px solid #d8deea; border-bottom: 1px solid #d8deea; }
          .details-cell:nth-child(2n) { border-right: 0; }
          .details-cell.full { grid-column: 1 / -1; border-right: 0; }
          .chart-card { margin-top: 34px; padding: 18px 18px 10px; border: 1px solid #d8deea; border-radius: 12px; background: #fbfdff; break-before: page; page-break-before: always; }
          .chart-card svg { display: block; width: 100%; height: auto; }
          .chart-bg { fill: #ffffff; }
          .grid-line { stroke: #d8deea; stroke-width: 1; }
          .axis-line { stroke: #173b79; stroke-width: 2; }
          .regression-line { stroke: #0b7a7a; stroke-width: 3; stroke-dasharray: 8 6; }
          .data-point { fill: #123d82; stroke: #ffffff; stroke-width: 2; }
          .point-label { fill: #52627f; font-size: 12px; font-weight: 700; }
          .axis-label { fill: #68758d; font-size: 11px; }
          .axis-title { fill: #173b79; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; border: 1px solid #d8deea; border-radius: 10px; overflow: hidden; }
          th, td { padding: 11px 14px; border-bottom: 1px solid #d8deea; text-align: left; font-size: 13px; }
          th { background: #eef3ff; color: #173b79; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
          tr:last-child td { border-bottom: 0; }
          .footer { margin-top: 42px; padding-top: 20px; border-top: 1px solid #d8deea; display: flex; justify-content: space-between; gap: 24px; color: #68758d; font-size: 11px; }
          @media print { body { background: #ffffff; } .page { margin: 0; box-shadow: none; width: auto; min-height: auto; max-width: none; break-after: avoid; page-break-after: avoid; } }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="topbar">
            <div class="brand">
              <div class="brand-mark">Q</div>
              <div>
                <h1 class="brand-title">Expert Chemistry</h1>
                <p class="brand-subtitle">Analytical Method Report</p>
              </div>
            </div>
            <div class="report-head">
              <h2 class="report-title">Linear Regression Calibration</h2>
              <span class="verified-pill">Calculated</span>
              <p class="report-id">Generated ${escapeHtml(generatedAt)}</p>
            </div>
          </header>
          <hr class="divider" />
          <section class="summary-card">
            <div class="summary-grid">
              <div><p class="mini-label">Equation</p><p class="mini-value alt">${escapeHtml(equation)}</p></div>
              <div><p class="mini-label">Correlation</p><p class="mini-value">${escapeHtml(payload.r2.toFixed(6))}</p></div>
              <div><p class="mini-label">Sample Absorbance</p><p class="mini-value">${escapeHtml(sampleText)}</p></div>
              <div><p class="mini-label">Calculated Concentration</p><p class="mini-value alt">${escapeHtml(concentrationText)}</p></div>
              <div><p class="mini-label">Dilution Factor</p><p class="mini-value">${escapeHtml(dilutionText)}</p></div>
            </div>
          </section>
          <section class="content-grid">
            <div>
              <h3 class="section-heading">Model Parameters</h3>
              <div class="details-card">
                <div class="details-cell"><p class="mini-label">Slope</p><p class="mini-value">${escapeHtml(formatNumber(payload.slope))}</p></div>
                <div class="details-cell"><p class="mini-label">Intercept</p><p class="mini-value">${escapeHtml(formatNumber(payload.intercept))}</p></div>
                <div class="details-cell"><p class="mini-label">Active Points</p><p class="mini-value">${payload.points.length}</p></div>
                <div class="details-cell"><p class="mini-label">Method</p><p class="mini-value">Least Squares</p></div>
                <div class="details-cell full"><p class="mini-label">Generated By</p><p class="mini-value">${escapeHtml(payload.currentUser.fullName)} (${escapeHtml(payload.currentUser.userId)})</p></div>
              </div>
            </div>
            <div>
              <h3 class="section-heading">Calibration Points</h3>
              <table>
                <thead><tr><th>Point</th><th>X Concentration</th><th>Y Absorbance</th></tr></thead>
                <tbody>${pointRows}</tbody>
              </table>
            </div>
          </section>
          <section class="chart-card">
            <h3 class="section-heading">Calibration Curve</h3>
            ${chartSvg}
          </section>
          <footer class="footer">
            <span>Expert Chemistry analytical workflow</span>
            <span>Confidential Lab Report</span>
          </footer>
        </main>
      </body>
    </html>
  `;

  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
  return true;
}

function openPrintableProjectMethodReport(payload: {
  currentUser: AuthUser;
  project: AnalyticalProject;
  method: ProjectMethod;
  resultLabel: string;
  resultValue: number | null;
  resultUnit: string;
  inputs: { label: string; value: string }[];
}) {
  const reportWindow = window.open('', '_blank', 'width=900,height=1200');

  if (!reportWindow) {
    window.alert('Unable to open the PDF preview window. Please allow pop-ups and try again.');
    return false;
  }

  const generatedAt = new Date().toLocaleString('pt-BR');
  const inputRows = payload.inputs.length ? payload.inputs.map((input) => `
    <tr>
      <td>${escapeHtml(input.label)}</td>
      <td>${escapeHtml(input.value || 'N/A')}</td>
    </tr>
  `).join('') : '<tr><td colspan="2">No inputs captured</td></tr>';
  const resultText = payload.resultValue === null
    ? 'N/A'
    : `${formatNumber(payload.resultValue)} ${escapeHtml(payload.resultUnit)}`;

  const reportHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Project Method Report</title>
        <style>
          * { box-sizing: border-box; }
          html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #e9eef6; color: #0b1f44; }
          .page { width: 210mm; min-height: 297mm; max-width: 980px; margin: 30px auto; background: #ffffff; padding: 52px 60px 46px; box-shadow: 0 22px 70px rgba(15, 23, 42, 0.14); }
          .topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
          .brand { display: flex; align-items: center; gap: 16px; }
          .brand-mark { width: 56px; height: 56px; border-radius: 12px; background: #123d82; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; }
          .brand-title { margin: 0; font-size: 22px; color: #0c2d6b; }
          .brand-subtitle { margin: 6px 0 0; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #5c8de0; }
          .report-head { text-align: right; }
          .report-title { margin: 0; font-size: 22px; color: #0b2c70; line-height: 1.2; }
          .verified-pill { display: inline-flex; margin-top: 12px; padding: 6px 14px; border-radius: 999px; background: #7ce2dc; color: #0b5a63; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
          .report-id { margin: 10px 0 0; font-size: 12px; color: #52627f; }
          .divider { margin: 20px 0 36px; border: 0; border-top: 2px solid #173b79; }
          .summary-card { padding: 22px 24px; border-radius: 12px; border: 1px solid #c7d2e4; background: #eef3ff; }
          .mini-label { margin: 0 0 8px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #68758d; font-weight: 700; }
          .mini-value { margin: 0; font-size: 17px; font-weight: 700; color: #10234d; }
          .mini-value.alt { color: #08646a; }
          .content-grid { margin-top: 34px; display: grid; grid-template-columns: 1fr 1fr; gap: 34px; }
          .section-heading { display: flex; align-items: center; gap: 14px; margin: 0 0 18px; font-size: 19px; color: #08276e; }
          .section-heading::before { content: ""; width: 4px; height: 30px; border-radius: 999px; background: #0b7a7a; }
          .details-card { border: 1px solid #d8deea; border-radius: 10px; overflow: hidden; background: #ffffff; }
          .details-cell { padding: 12px 16px 14px; border-bottom: 1px solid #d8deea; }
          .details-cell:last-child { border-bottom: 0; }
          table { width: 100%; border-collapse: collapse; border: 1px solid #d8deea; border-radius: 10px; overflow: hidden; }
          th, td { padding: 11px 14px; border-bottom: 1px solid #d8deea; text-align: left; font-size: 13px; }
          th { background: #eef3ff; color: #173b79; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
          tr:last-child td { border-bottom: 0; }
          .footer { margin-top: 42px; padding-top: 20px; border-top: 1px solid #d8deea; display: flex; justify-content: space-between; gap: 24px; color: #68758d; font-size: 11px; }
          @media print { body { background: #ffffff; } .page { margin: 0; box-shadow: none; width: auto; min-height: auto; max-width: none; break-after: avoid; page-break-after: avoid; } }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="topbar">
            <div class="brand">
              <div class="brand-mark">Q</div>
              <div>
                <h1 class="brand-title">Expert Chemistry</h1>
                <p class="brand-subtitle">Analytical Method Report</p>
              </div>
            </div>
            <div class="report-head">
              <h2 class="report-title">${escapeHtml(payload.method.name)}</h2>
              <span class="verified-pill">Calculated</span>
              <p class="report-id">Generated ${escapeHtml(generatedAt)}</p>
            </div>
          </header>
          <hr class="divider" />
          <section class="summary-card">
            <p class="mini-label">${escapeHtml(payload.resultLabel)}</p>
            <p class="mini-value alt">${escapeHtml(resultText)}</p>
          </section>
          <section class="content-grid">
            <div>
              <h3 class="section-heading">Method Details</h3>
              <div class="details-card">
                <div class="details-cell"><p class="mini-label">Project</p><p class="mini-value">${escapeHtml(payload.project.compound)}</p></div>
                <div class="details-cell"><p class="mini-label">Method Type</p><p class="mini-value">${escapeHtml(payload.method.type)}</p></div>
                <div class="details-cell"><p class="mini-label">Formula</p><p class="mini-value">${escapeHtml(payload.method.expression)}</p></div>
                <div class="details-cell"><p class="mini-label">Generated By</p><p class="mini-value">${escapeHtml(payload.currentUser.fullName)} (${escapeHtml(payload.currentUser.userId)})</p></div>
              </div>
            </div>
            <div>
              <h3 class="section-heading">Inputs</h3>
              <table>
                <thead><tr><th>Input</th><th>Value</th></tr></thead>
                <tbody>${inputRows}</tbody>
              </table>
            </div>
          </section>
          <footer class="footer">
            <span>Expert Chemistry analytical workflow</span>
            <span>Confidential Lab Report</span>
          </footer>
        </main>
      </body>
    </html>
  `;

  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
  return true;
}

interface MethodsProps {
  currentUser: AuthUser;
  globalSearch?: { query: string; nonce: number };
}

const METHODS_TEXT = {
  en: {
    sop: 'Standard Operating Procedures',
    title: 'Analytical Projects',
    description: 'Choose a compound project, add calculation methods, and automate results from equipment readings like absorbance, transmittance and wavelength.',
    formulaBuilderTitle: 'Formula Method Builder',
    methodName: 'Method name',
    calculationType: 'Calculation type',
    formula: 'Formula',
    resultUnit: 'Result unit',
    formulaBuilder: 'Formula Builder',
    singleVariable: 'Single variable',
    addVariable: 'Add variable',
    timeSequence: 'Time sequence',
    addSequence: 'Add sequence',
    blankSequence: 'Blank sequence',
    sequenceHint: 'Prefix, start second, interval and count.',
    constants: 'Constants',
    addConstant: 'Add constant',
    variables: 'Variables',
    noVariables: 'No variables created yet.',
    savedConstants: 'Saved constants',
    noConstants: 'No constants saved yet.',
    backToProject: 'Back to project',
    backToProjectList: 'Back to project list',
    workspace: 'Project Workspace',
    projectMethods: 'Project Methods',
    selectOne: 'Select one',
    deleteMethod: 'Delete method',
    methodRunner: 'Method Runner',
    equipmentTarget: 'Equipment reading target',
    equipmentTargetHint: 'Incoming hardware values fill the selected field.',
    disconnectEquipment: 'Disconnect Equipment',
    connectEquipment: 'Connect Serial Equipment',
    recognizedVariables: 'Recognized variables',
    noRecognizedVariables: 'No variables found yet.',
    projectLibrary: 'Project Library',
    compoundProjects: 'Compound Projects',
    searchProjects: 'Search compound, matrix or ID',
    createProject: 'Create Project',
    newCompound: 'New Compound',
    compoundName: 'Compound name',
    purpose: 'Purpose',
    defaultMethod: 'Default method',
    resetAll: 'Reset All Fields',
    importFile: 'Import from file',
    hardwareTarget: 'Hardware reading target',
    targetWavelength: 'Target Wavelength (nm)',
    absorbance: 'Absorbance (A)',
    blank: 'Blank (Baseline)',
    targetConcentration: 'Target Conc. (mol/L)',
    molarCoeff: 'Molar Coeff. (epsilon)',
    pathLength: 'Path Length (cm)',
    dilutionFactor: 'Dilution Factor (DF)',
    spectralScan: 'Spectral Scan',
    calculationResult: 'Calculation Result',
    effectiveAbsorbance: 'Effective Absorbance (A)',
    appliedFormula: 'Applied Formula',
    wavelength: 'Wavelength',
    beerLambertMethod: 'Method: Beer-Lambert Law Calculation',
    analyticalParameters: 'Analytical Parameters:',
    backToMethod: 'Back to method',
    regressionCalculator: 'Linear Regression Calculator',
    calibrationCurve: 'Data Calibration Curve',
    clearPoints: 'Clear All Points',
    importPoints: 'Import Points from File',
    concentrationX: 'Concentration (X - mol/L)',
    absorbanceY: 'Absorbance (Y - AU)',
    noDataPoints: 'No data points added',
    linearModel: 'Linear Calibration Model',
    leastSquares: 'Least Squares Method',
    regressionEquation: 'Regression Equation',
    copyEquation: 'Copy Equation',
    sensitivity: 'Sensitivity (m)',
    intercept: 'Intercept (b)',
    correlation: 'Correlation (R2)',
    waitingPoints: 'Waiting for data points',
    sampleQuantification: 'Sample Quantification',
    sampleAbsorbance: 'Sample absorbance',
    standardAbsorbance: 'Standard absorbance',
    standardConcentration: 'Standard concentration',
    sampleConcentrationUnit: 'Sample concentration unit',
    blankAbsorbance: 'Blank absorbance',
    transmittance: 'Transmittance (%)',
    printMethodReport: 'Print Method Report',
    createCustomMethod: 'Create Custom Method',
    noProjects: 'No projects found for this search.'
  },
  pt: {
    sop: 'Procedimentos Operacionais Padrão',
    title: 'Projetos Analíticos',
    description: 'Escolha um projeto de composto, adicione métodos de cálculo e automatize resultados a partir de leituras de equipamento como absorbância, transmitância e comprimento de onda.',
    formulaBuilderTitle: 'Construtor de Método por Fórmula',
    methodName: 'Nome do método',
    calculationType: 'Tipo de cálculo',
    formula: 'Fórmula',
    resultUnit: 'Unidade do resultado',
    formulaBuilder: 'Construtor de Fórmula',
    singleVariable: 'Variável única',
    addVariable: 'Adicionar variável',
    timeSequence: 'Sequência temporal',
    addSequence: 'Adicionar sequência',
    blankSequence: 'Sequência de branco',
    sequenceHint: 'Prefixo, segundo inicial, intervalo e quantidade.',
    constants: 'Constantes',
    addConstant: 'Adicionar constante',
    variables: 'Variáveis',
    noVariables: 'Nenhuma variável criada ainda.',
    savedConstants: 'Constantes salvas',
    noConstants: 'Nenhuma constante salva ainda.',
    backToProject: 'Voltar ao projeto',
    backToProjectList: 'Voltar à lista de projetos',
    workspace: 'Área do Projeto',
    projectMethods: 'Métodos do Projeto',
    selectOne: 'Selecione um',
    deleteMethod: 'Excluir método',
    methodRunner: 'Executor do Método',
    equipmentTarget: 'Campo da leitura do equipamento',
    equipmentTargetHint: 'Valores recebidos do hardware preenchem o campo selecionado.',
    disconnectEquipment: 'Desconectar Equipamento',
    connectEquipment: 'Conectar Equipamento Serial',
    recognizedVariables: 'Variáveis reconhecidas',
    noRecognizedVariables: 'Nenhuma variável encontrada ainda.',
    projectLibrary: 'Biblioteca de Projetos',
    compoundProjects: 'Projetos de Compostos',
    searchProjects: 'Pesquisar composto, matriz ou ID',
    createProject: 'Criar Projeto',
    newCompound: 'Novo Composto',
    compoundName: 'Nome do composto',
    purpose: 'Objetivo',
    defaultMethod: 'Método padrão',
    resetAll: 'Limpar Todos os Campos',
    importFile: 'Importar arquivo',
    hardwareTarget: 'Campo da leitura do hardware',
    targetWavelength: 'Comprimento de Onda Alvo (nm)',
    absorbance: 'Absorbância (A)',
    blank: 'Branco (Linha de Base)',
    targetConcentration: 'Conc. Alvo (mol/L)',
    molarCoeff: 'Coef. Molar (epsilon)',
    pathLength: 'Caminho Óptico (cm)',
    dilutionFactor: 'Fator de Diluição (FD)',
    spectralScan: 'Varredura Espectral',
    calculationResult: 'Resultado do Cálculo',
    effectiveAbsorbance: 'Absorbância Efetiva (A)',
    appliedFormula: 'Fórmula Aplicada',
    wavelength: 'Comprimento de onda',
    beerLambertMethod: 'Método: Cálculo pela Lei de Beer-Lambert',
    analyticalParameters: 'Parâmetros Analíticos:',
    backToMethod: 'Voltar ao método',
    regressionCalculator: 'Calculadora de Regressão Linear',
    calibrationCurve: 'Curva de Calibração de Dados',
    clearPoints: 'Limpar Todos os Pontos',
    importPoints: 'Importar Pontos do Arquivo',
    concentrationX: 'Concentração (X - mol/L)',
    absorbanceY: 'Absorbância (Y - AU)',
    noDataPoints: 'Nenhum ponto adicionado',
    linearModel: 'Modelo de Calibração Linear',
    leastSquares: 'Método dos Mínimos Quadrados',
    regressionEquation: 'Equação de Regressão',
    copyEquation: 'Copiar Equação',
    sensitivity: 'Sensibilidade (m)',
    intercept: 'Intercepto (b)',
    correlation: 'Correlação (R2)',
    waitingPoints: 'Aguardando pontos de dados',
    sampleQuantification: 'Quantificação da Amostra',
    sampleAbsorbance: 'Absorbância da amostra',
    standardAbsorbance: 'Absorbância padrão',
    standardConcentration: 'Concentração padrão',
    sampleConcentrationUnit: 'Unidade da concentração da amostra',
    blankAbsorbance: 'Absorbância do branco',
    transmittance: 'Transmitância (%)',
    printMethodReport: 'Imprimir Relatório do Método',
    createCustomMethod: 'Criar Método Personalizado',
    noProjects: 'Nenhum projeto encontrado para esta busca.'
  },
  es: {
    sop: 'Procedimientos Operativos Estándar',
    title: 'Proyectos Analíticos',
    description: 'Elige un proyecto de compuesto, agrega métodos de cálculo y automatiza resultados desde lecturas de equipo como absorbancia, transmitancia y longitud de onda.',
    formulaBuilderTitle: 'Constructor de Método por Fórmula',
    methodName: 'Nombre del método',
    calculationType: 'Tipo de cálculo',
    formula: 'Fórmula',
    resultUnit: 'Unidad del resultado',
    formulaBuilder: 'Constructor de Fórmula',
    singleVariable: 'Variable única',
    addVariable: 'Agregar variable',
    timeSequence: 'Secuencia temporal',
    addSequence: 'Agregar secuencia',
    blankSequence: 'Secuencia de blanco',
    sequenceHint: 'Prefijo, segundo inicial, intervalo y cantidad.',
    constants: 'Constantes',
    addConstant: 'Agregar constante',
    variables: 'Variables',
    noVariables: 'Aún no hay variables creadas.',
    savedConstants: 'Constantes guardadas',
    noConstants: 'Aún no hay constantes guardadas.',
    backToProject: 'Volver al proyecto',
    backToProjectList: 'Volver a la lista de proyectos',
    workspace: 'Área del Proyecto',
    projectMethods: 'Métodos del Proyecto',
    selectOne: 'Selecciona uno',
    deleteMethod: 'Eliminar método',
    methodRunner: 'Ejecutor del Método',
    equipmentTarget: 'Campo de lectura del equipo',
    equipmentTargetHint: 'Los valores recibidos del hardware llenan el campo seleccionado.',
    disconnectEquipment: 'Desconectar Equipo',
    connectEquipment: 'Conectar Equipo Serial',
    recognizedVariables: 'Variables reconocidas',
    noRecognizedVariables: 'Aún no se encontraron variables.',
    projectLibrary: 'Biblioteca de Proyectos',
    compoundProjects: 'Proyectos de Compuestos',
    searchProjects: 'Buscar compuesto, matriz o ID',
    createProject: 'Crear Proyecto',
    newCompound: 'Nuevo Compuesto',
    compoundName: 'Nombre del compuesto',
    purpose: 'Objetivo',
    defaultMethod: 'Método predeterminado',
    resetAll: 'Limpiar Todos los Campos',
    importFile: 'Importar archivo',
    hardwareTarget: 'Campo de lectura del hardware',
    targetWavelength: 'Longitud de Onda Objetivo (nm)',
    absorbance: 'Absorbancia (A)',
    blank: 'Blanco (Línea Base)',
    targetConcentration: 'Conc. Objetivo (mol/L)',
    molarCoeff: 'Coef. Molar (epsilon)',
    pathLength: 'Longitud de Camino (cm)',
    dilutionFactor: 'Factor de Dilución (FD)',
    spectralScan: 'Barrido Espectral',
    calculationResult: 'Resultado del Cálculo',
    effectiveAbsorbance: 'Absorbancia Efectiva (A)',
    appliedFormula: 'Fórmula Aplicada',
    wavelength: 'Longitud de onda',
    beerLambertMethod: 'Método: Cálculo por Ley de Beer-Lambert',
    analyticalParameters: 'Parámetros Analíticos:',
    backToMethod: 'Volver al método',
    regressionCalculator: 'Calculadora de Regresión Lineal',
    calibrationCurve: 'Curva de Calibración de Datos',
    clearPoints: 'Limpiar Todos los Puntos',
    importPoints: 'Importar Puntos del Archivo',
    concentrationX: 'Concentración (X - mol/L)',
    absorbanceY: 'Absorbancia (Y - AU)',
    noDataPoints: 'No se agregaron puntos',
    linearModel: 'Modelo de Calibración Lineal',
    leastSquares: 'Método de Mínimos Cuadrados',
    regressionEquation: 'Ecuación de Regresión',
    copyEquation: 'Copiar Ecuación',
    sensitivity: 'Sensibilidad (m)',
    intercept: 'Intercepto (b)',
    correlation: 'Correlación (R2)',
    waitingPoints: 'Esperando puntos de datos',
    sampleQuantification: 'Cuantificación de Muestra',
    sampleAbsorbance: 'Absorbancia de la muestra',
    standardAbsorbance: 'Absorbancia estándar',
    standardConcentration: 'Concentración estándar',
    sampleConcentrationUnit: 'Unidad de concentración de la muestra',
    blankAbsorbance: 'Absorbancia del blanco',
    transmittance: 'Transmitancia (%)',
    printMethodReport: 'Imprimir Informe del Método',
    createCustomMethod: 'Crear Método Personalizado',
    noProjects: 'No se encontraron proyectos para esta búsqueda.'
  }
};

export default function Methods({ currentUser, globalSearch }: MethodsProps) {
  const { language } = useLanguage();
  const text = METHODS_TEXT[language];
  const initialStoredProjectsRef = useRef<AnalyticalProject[] | null>(null);
  const getInitialProjects = () => {
    if (!initialStoredProjectsRef.current) {
      initialStoredProjectsRef.current = loadRecoveredProjects(currentUser);
    }

    return initialStoredProjectsRef.current;
  };

  const [activeTab, setActiveTab] = useState<'library' | 'lambert-beer' | 'linear-regression'>('library');
  const [projects, setProjects] = useState<AnalyticalProject[]>(getInitialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(() => getInitialProjects()[0]?.id ?? initialProjectLibrary[0].id);
  const [openedProjectId, setOpenedProjectId] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState(() => getInitialProjects()[0]?.methods[0]?.id ?? initialProjectLibrary[0].methods[0].id);
  const [methodReturnTarget, setMethodReturnTarget] = useState<{ projectId: string; methodId: string } | null>(null);
  const [projectMode, setProjectMode] = useState<'workspace' | 'method-builder'>('workspace');
  const [projectSearch, setProjectSearch] = useState('');
  const [newProjectCompound, setNewProjectCompound] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState<ProjectMethodType>('direct-proportion');
  const [newMethodExpression, setNewMethodExpression] = useState('');
  const [newMethodResultUnit, setNewMethodResultUnit] = useState('');
  const [formulaBuilderVariables, setFormulaBuilderVariables] = useState<string[]>([]);
  const [formulaBuilderConstants, setFormulaBuilderConstants] = useState<FormulaConstant[]>([]);
  const [newVariableName, setNewVariableName] = useState('');
  const [newConstantName, setNewConstantName] = useState('');
  const [newConstantValue, setNewConstantValue] = useState('');
  const [sequencePrefix, setSequencePrefix] = useState('Abs');
  const [sequenceStart, setSequenceStart] = useState('0');
  const [sequenceStep, setSequenceStep] = useState('1');
  const [sequenceCount, setSequenceCount] = useState('3');

  useEffect(() => {
    if (!globalSearch) return;
    setActiveTab('library');
    setProjectMode('workspace');
    setProjectSearch(globalSearch.query);
  }, [globalSearch?.nonce]);
  const [methodInputs, setMethodInputs] = useState({
    sampleAbsorbance: '',
    standardAbsorbance: '',
    standardConcentration: '',
    concentrationUnit: 'mg/L',
    blankAbsorbance: '',
    transmittance: ''
  });
  const [projectSerialTarget, setProjectSerialTarget] = useState<ProjectReadingTarget>('sampleAbsorbance');
  const [customFormulaInputs, setCustomFormulaInputs] = useState<Record<string, string>>({});
  
  // States para a Calculadora Lambert-Beer
  const [calcMode, setCalcMode] = useState<'concentration' | 'absorbance'>('concentration');
  const [absSample, setAbsSample] = useState('0');
  const [absBlank, setAbsBlank] = useState('0');
  const [epsilon, setEpsilon] = useState('0');
  const [pathLength, setPathLength] = useState('1');
  const [dilutionFactor, setDilutionFactor] = useState('1');
  const [inputConcentration, setInputConcentration] = useState('0');
  const [targetWavelength, setTargetWavelength] = useState('');
  const [scanMap, setScanMap] = useState<Record<string, string>>({});
  const [lambertSerialTarget, setLambertSerialTarget] = useState<'sample' | 'blank'>('sample');
  const [hoveredScanWavelength, setHoveredScanWavelength] = useState<string | null>(null);
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const pageRootRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const regressionFileInputRef = useRef<HTMLInputElement>(null);
  const analysisFieldStartValues = useRef<Record<string, string>>({});
  const analysisRunIdRef = useRef(createAnalysisRunId());
  const skipNextSampleScanSyncRef = useRef(false);

  // Linear regression states
  const [regressionPoints, setRegressionPoints] = useState<{ x: string, y: string, active: boolean }[]>([]);
  const [newX, setNewX] = useState('');
  const [newY, setNewY] = useState('');
  const [sampleY, setSampleY] = useState('');
  const [regressionSampleDilution, setRegressionSampleDilution] = useState('1');
  const [regressionSerialTarget, setRegressionSerialTarget] = useState<'point' | 'sample'>('point');
  const filteredProjects = projects.filter((project) => {
    const search = projectSearch.trim().toLowerCase();
    if (!search) return true;

    return [project.compound, project.matrix, project.wavelength, project.id]
      .some((value) => value.toLowerCase().includes(search));
  });
  const openedProject = projects.find((project) => project.id === openedProjectId) ?? null;
  const selectedMethod = openedProject?.methods.find((method) => method.id === selectedMethodId) ?? openedProject?.methods[0] ?? null;
  const returnTargetProject = methodReturnTarget
    ? projects.find((project) => project.id === methodReturnTarget.projectId) ?? null
    : null;
  const returnTargetMethod = returnTargetProject?.methods.find((method) => method.id === methodReturnTarget?.methodId) ?? null;
  const selectedMethodType = methodTypeOptions.find((option) => option.value === newMethodType) ?? methodTypeOptions[0];
  const customFormulaResult = selectedMethod?.type === 'custom-formula'
    ? evaluateCustomFormula(selectedMethod.expression, customFormulaInputs, selectedMethod.constants)
    : null;

  // Ref para rastrear a aba ativa dentro do loop de leitura serial (evita stale closures)
  const activeTabRef = useRef(activeTab);
  const lambertSerialTargetRef = useRef(lambertSerialTarget);
  const regressionSerialTargetRef = useRef(regressionSerialTarget);
  const projectSerialTargetRef = useRef(projectSerialTarget);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  useEffect(() => {
    lambertSerialTargetRef.current = lambertSerialTarget;
  }, [lambertSerialTarget]);
  useEffect(() => {
    regressionSerialTargetRef.current = regressionSerialTarget;
  }, [regressionSerialTarget]);
  useEffect(() => {
    projectSerialTargetRef.current = projectSerialTarget;
  }, [projectSerialTarget]);

  useEffect(() => {
    const nextProjects = loadRecoveredProjects(currentUser);
    initialStoredProjectsRef.current = nextProjects;

    setProjects(nextProjects);
    setSelectedProjectId(nextProjects[0]?.id ?? initialProjectLibrary[0].id);
    setSelectedMethodId(nextProjects[0]?.methods[0]?.id ?? initialProjectLibrary[0].methods[0].id);
    setOpenedProjectId(null);
    setMethodReturnTarget(null);
    setProjectMode('workspace');
  }, [currentUser.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storageKey = getMethodsStorageKey(currentUser);
    const reloadStoredProjects = () => {
      const nextProjects = loadRecoveredProjects(currentUser);
      initialStoredProjectsRef.current = nextProjects;

      setProjects((currentProjects) => (
        areProjectListsEqual(currentProjects, nextProjects) ? currentProjects : nextProjects
      ));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        reloadStoredProjects();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadStoredProjects();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', reloadStoredProjects);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', reloadStoredProjects);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  useEffect(() => {
    storeProjects(currentUser, projects);
  }, [currentUser, projects]);
  useEffect(() => {
    if (projects.length === 0) return;

    if (!projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }

    if (openedProjectId && !projects.some((project) => project.id === openedProjectId)) {
      setOpenedProjectId(null);
      setProjectMode('workspace');
    }

    if (
      methodReturnTarget &&
      !projects.some((project) => (
        project.id === methodReturnTarget.projectId &&
        project.methods.some((method) => method.id === methodReturnTarget.methodId)
      ))
    ) {
      setMethodReturnTarget(null);
    }
  }, [methodReturnTarget, openedProjectId, projects, selectedProjectId]);

  const addPoint = () => {
    if (newX.trim() && newY.trim()) {
      const nextX = newX.replace(',', '.');
      const nextY = newY.replace(',', '.');
      setRegressionPoints([...regressionPoints, { x: nextX, y: nextY, active: true }]);
      void recordAnalysisStep({
        ...getMethodAuditContext('Linear Regression'),
        fieldKey: `calibration_point_${regressionPoints.length + 1}`,
        fieldLabel: `Calibration point ${regressionPoints.length + 1}`,
        previousValue: '',
        nextValue: `X=${nextX}; Y=${nextY}`,
        stepDescription: `Added calibration point ${regressionPoints.length + 1}: concentration ${nextX}, response ${nextY}.`
      });
      setNewX('');
      setNewY('');
    }
  };

  const createProject = () => {
    const compound = newProjectCompound.trim();
    if (!compound) return;

    const projectNumber = projects.length + 1;
    const newProject: AnalyticalProject = {
      id: `PRJ-${compound.slice(0, 3).toUpperCase()}-${String(projectNumber).padStart(2, '0')}`,
      compound,
      matrix: 'Not defined',
      wavelength: 'Not defined',
      description: newProjectDescription.trim() || 'Project created to configure custom analytical methods.',
      inputs: ['Absorbance', 'Transmittance', 'Known concentration'],
      methods: [
        {
          id: `MTD-${compound.slice(0, 3).toUpperCase()}-${String(projectNumber).padStart(2, '0')}`,
          name: 'Direct proportion',
          expression: 'C sample = (A sample x C standard) / A standard',
          type: 'direct-proportion',
          tab: 'linear-regression'
        }
      ]
    };

    setProjects((currentProjects) => [newProject, ...currentProjects]);
    setSelectedProjectId(newProject.id);
    setProjectSearch('');
    setNewProjectCompound('');
    setNewProjectDescription('');
  };

  const openProjectWorkspace = (project: AnalyticalProject) => {
    setSelectedProjectId(project.id);
    setOpenedProjectId(project.id);
    setSelectedMethodId(project.methods[0]?.id ?? '');
    setProjectMode('workspace');
  };

  const scrollToMethodsStart = () => {
    window.requestAnimationFrame(() => {
      pageRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openLibraryRoot = () => {
    setActiveTab('library');
    setMethodReturnTarget(null);
    setOpenedProjectId(null);
    setProjectMode('workspace');
    scrollToMethodsStart();
  };

  const openCalculatorTab = (tab: 'lambert-beer' | 'linear-regression') => {
    setMethodReturnTarget(null);
    setActiveTab(tab);
    scrollToMethodsStart();
  };

  const openMethodBuilder = () => {
    setProjectMode('method-builder');
    setNewMethodType('custom-formula');
  };

  const closeMethodBuilder = () => {
    setProjectMode('workspace');
  };

  const getMethodTargetTab = (method: ProjectMethod): MethodTab | null => {
    if (method.type === 'calibration-curve') return 'linear-regression';
    if (method.tab === 'linear-regression' && /\b(regression|calibration|curve)\b/i.test(`${method.name} ${method.expression}`)) {
      return 'linear-regression';
    }

    return method.tab ?? null;
  };

  const selectProjectMethod = (method: ProjectMethod) => {
    setSelectedMethodId(method.id);

    const targetTab = getMethodTargetTab(method);
    if (targetTab === 'linear-regression' && method.type === 'calibration-curve') {
      if (openedProject) {
        setMethodReturnTarget({ projectId: openedProject.id, methodId: method.id });
      }
      setActiveTab(targetTab);
      scrollToMethodsStart();
    }
  };

  const openSelectedMethodAdvanced = () => {
    if (!selectedMethod) return;

    const targetTab = getMethodTargetTab(selectedMethod);
    if (targetTab) {
      if (openedProject && targetTab === 'linear-regression') {
        setMethodReturnTarget({ projectId: openedProject.id, methodId: selectedMethod.id });
      }
      setActiveTab(targetTab);
      scrollToMethodsStart();
    }
  };

  const returnToProjectMethod = () => {
    if (!returnTargetProject || !returnTargetMethod) return;

    setSelectedProjectId(returnTargetProject.id);
    setOpenedProjectId(returnTargetProject.id);
    setSelectedMethodId(returnTargetMethod.id);
    setProjectMode('workspace');
    setActiveTab('library');
    scrollToMethodsStart();
  };

  const deleteProjectMethod = (projectId: string, methodId: string) => {
    setProjects((currentProjects) => currentProjects.map((project) => {
      if (project.id !== projectId) return project;

      return {
        ...project,
        methods: project.methods.filter((method) => method.id !== methodId)
      };
    }));

    if (selectedMethodId === methodId) {
      const project = projects.find((currentProject) => currentProject.id === projectId);
      const nextMethod = project?.methods.find((method) => method.id !== methodId);
      setSelectedMethodId(nextMethod?.id ?? '');
    }
  };

  const appendFormulaToken = (token: string) => {
    setNewMethodExpression((currentExpression) => {
      const trimmedExpression = currentExpression.trim();
      return trimmedExpression ? `${trimmedExpression} ${token}` : token;
    });
  };

  const addFormulaBuilderVariable = (rawName: string) => {
    const variableName = normalizeFormulaName(rawName);
    if (!variableName) return;

    setFormulaBuilderVariables((currentVariables) => (
      currentVariables.includes(variableName) ? currentVariables : [...currentVariables, variableName]
    ));
    appendFormulaToken(variableName);
    setNewVariableName('');
  };

  const addFormulaBuilderSequence = (prefixOverride?: string) => {
    const prefix = normalizeFormulaName(prefixOverride ?? sequencePrefix) || 'Var';
    const start = Math.max(0, Math.trunc(parseDecimal(sequenceStart)));
    const step = Math.max(1, Math.trunc(parseDecimal(sequenceStep)));
    const count = Math.min(24, Math.max(1, Math.trunc(parseDecimal(sequenceCount))));
    const sequenceVariables = Array.from({ length: count }, (_, index) => `${prefix}_${start + index * step}s`);

    setFormulaBuilderVariables((currentVariables) => Array.from(new Set([...currentVariables, ...sequenceVariables])));
  };

  const addFormulaBuilderConstant = () => {
    const constantName = normalizeFormulaName(newConstantName);
    const constantValue = parseDecimal(newConstantValue);
    if (!constantName || !Number.isFinite(constantValue)) return;

    setFormulaBuilderConstants((currentConstants) => {
      const withoutExisting = currentConstants.filter((constant) => constant.name !== constantName);
      return [...withoutExisting, { name: constantName, value: constantValue }];
    });
    appendFormulaToken(constantName);
    setNewConstantName('');
    setNewConstantValue('');
  };

  const createCustomMethod = () => {
    if (!openedProject) return;
    if (newMethodType === 'custom-formula' && !newMethodExpression.trim()) return;

    const methodName = newMethodName.trim() || selectedMethodType.label;
    const methodExpression = newMethodType === 'custom-formula'
      ? newMethodExpression.trim() || 'Custom equation'
      : selectedMethodType.expression;
    const methodNumber = openedProject.methods.length + 1;
    const methodId = `MTD-${openedProject.id.replace('PRJ-', '')}-${String(methodNumber).padStart(2, '0')}`;
    const newMethod: ProjectMethod = {
      id: methodId,
      name: methodName,
      expression: methodExpression,
      type: newMethodType,
      tab: newMethodType === 'blank-correction' || newMethodType === 'transmittance-absorbance' ? 'lambert-beer' : 'linear-regression',
      constants: newMethodType === 'custom-formula' ? formulaBuilderConstants : undefined,
      resultUnit: newMethodType === 'custom-formula' ? newMethodResultUnit.trim() || undefined : undefined
    };

    setProjects((currentProjects) => currentProjects.map((project) => (
      project.id === openedProject.id
        ? { ...project, methods: [...project.methods, newMethod] }
        : project
    )));
    setSelectedMethodId(methodId);
    setNewMethodName('');
    setNewMethodExpression('');
    setNewMethodResultUnit('');
    setNewMethodType('direct-proportion');
    setFormulaBuilderVariables([]);
    setFormulaBuilderConstants([]);

    if (newMethod.type === 'calibration-curve') {
      setMethodReturnTarget({ projectId: openedProject.id, methodId });
      setActiveTab('linear-regression');
      scrollToMethodsStart();
    } else {
      setProjectMode('workspace');
    }
  };

  const updateMethodInput = (field: keyof typeof methodInputs, value: string) => {
    setMethodInputs((currentInputs) => ({ ...currentInputs, [field]: value }));
  };

  const updateCustomFormulaInput = (variable: string, value: string) => {
    setCustomFormulaInputs((currentInputs) => ({ ...currentInputs, [variable]: value }));
  };

  const customFormulaVariables = customFormulaResult?.variables ?? [];

  const getAnalysisAction = (previousValue: string, nextValue: string) => {
    if (previousValue && !nextValue) return 'cleared';
    if (!previousValue && nextValue) return 'filled';
    return 'changed';
  };

  const recordAnalysisStep = async (payload: AnalysisAuditPayload) => {
    const previousValue = String(payload.previousValue ?? '').trim();
    const nextValue = String(payload.nextValue ?? '').trim();

    if (!payload.fieldLabel || previousValue === nextValue) return;

    try {
      await fetch('/api/audit/analysis-events', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          analysisRunId: payload.analysisRunId ?? analysisRunIdRef.current,
          previousValue,
          nextValue,
          action: payload.action ?? getAnalysisAction(previousValue, nextValue)
        })
      });
    } catch (error) {
      console.warn('Failed to record analysis audit event:', error);
    }
  };

  const getMethodAuditContext = (workflow: string) => ({
    analysisRunId: analysisRunIdRef.current,
    workflow,
    projectId: openedProject?.id ?? returnTargetProject?.id ?? '',
    projectName: openedProject?.compound ?? returnTargetProject?.compound ?? '',
    methodId: selectedMethod?.id ?? returnTargetMethod?.id ?? '',
    methodName: selectedMethod?.name ?? returnTargetMethod?.name ?? '',
    compoundName: openedProject?.compound ?? returnTargetProject?.compound ?? workflow,
    casId: openedProject?.id ?? returnTargetProject?.id ?? 'N/A'
  });

  const markAnalysisFieldStart = (fieldKey: string, value: string) => {
    analysisFieldStartValues.current[fieldKey] = value;
  };

  const startNextAnalysisRun = () => {
    analysisRunIdRef.current = createAnalysisRunId();
  };

  const commitAnalysisFieldChange = (
    fieldKey: string,
    fieldLabel: string,
    nextValue: string,
    workflow: string,
    stepDescription?: string
  ) => {
    const previousValue = analysisFieldStartValues.current[fieldKey] ?? '';
    delete analysisFieldStartValues.current[fieldKey];

    void recordAnalysisStep({
      ...getMethodAuditContext(workflow),
      fieldKey,
      fieldLabel,
      previousValue,
      nextValue,
      stepDescription
    });
  };

  const getProjectReadingTargets = (method: ProjectMethod | null) => {
    if (!method) return [] as { value: ProjectReadingTarget; label: string }[];

    if (method.type === 'direct-proportion') {
      return [
        { value: 'sampleAbsorbance' as const, label: 'Sample A' },
        { value: 'standardAbsorbance' as const, label: 'Standard A' }
      ];
    }

    if (method.type === 'blank-correction') {
      return [
        { value: 'sampleAbsorbance' as const, label: 'Sample A' },
        { value: 'blankAbsorbance' as const, label: 'Blank A' }
      ];
    }

    if (method.type === 'transmittance-absorbance') {
      return [{ value: 'transmittance' as const, label: 'Transmittance' }];
    }

    if (method.type === 'custom-formula') {
      return customFormulaVariables.map((variable) => ({
        value: `custom:${variable}` as const,
        label: variable
      }));
    }

    return [] as { value: ProjectReadingTarget; label: string }[];
  };

  const projectReadingTargets = getProjectReadingTargets(selectedMethod);

  useEffect(() => {
    if (projectReadingTargets.length === 0) return;
    if (!projectReadingTargets.some((target) => target.value === projectSerialTarget)) {
      setProjectSerialTarget(projectReadingTargets[0].value);
    }
  }, [projectReadingTargets, projectSerialTarget]);

  const applyProjectHardwareReading = (value: string) => {
    const target = projectSerialTargetRef.current;

    if (target.startsWith('custom:')) {
      const variable = target.replace('custom:', '');
      setCustomFormulaInputs((currentInputs) => ({ ...currentInputs, [variable]: value }));
      void recordAnalysisStep({
        ...getMethodAuditContext('Project Method'),
        fieldKey: `custom_${variable}`,
        fieldLabel: variable,
        previousValue: customFormulaInputs[variable] ?? '',
        nextValue: value,
        stepDescription: `Captured hardware reading for ${variable}: ${value}.`
      });
      return;
    }

    setMethodInputs((currentInputs) => ({ ...currentInputs, [target]: value }));
    void recordAnalysisStep({
      ...getMethodAuditContext('Project Method'),
      fieldKey: target,
      fieldLabel: target,
      previousValue: methodInputs[target],
      nextValue: value,
      stepDescription: `Captured hardware reading for ${target}: ${value}.`
    });
  };

  const saveReportSnapshot = async (payload: ReturnType<typeof buildReportPayload>) => {
    const response = await fetch('/api/reports', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
  };

  const registerCompletedAnalysis = async (payload: ReturnType<typeof buildReportPayload>) => {
    try {
      await saveReportSnapshot(payload);
      return true;
    } catch (error) {
      console.error('Failed to register completed analysis report:', error);
      window.alert('Unable to register this analysis as a completed report. The dashboard will only update after the report is saved.');
      return false;
    }
  };

  const calculateProjectMethod = (method: ProjectMethod | null) => {
    if (!method) return null;

    const sampleAbsorbance = parseDecimal(methodInputs.sampleAbsorbance);
    const standardAbsorbance = parseDecimal(methodInputs.standardAbsorbance);
    const standardConcentration = parseDecimal(methodInputs.standardConcentration);
    const concentrationUnit = methodInputs.concentrationUnit.trim() || 'concentration units';
    const blankAbsorbance = parseDecimal(methodInputs.blankAbsorbance);
    const transmittance = parseDecimal(methodInputs.transmittance);

    if (method.type === 'direct-proportion') {
      if (standardAbsorbance === 0) return null;
      return {
        label: 'Calculated sample concentration',
        value: (sampleAbsorbance * standardConcentration) / standardAbsorbance,
        unit: concentrationUnit
      };
    }

    if (method.type === 'blank-correction') {
      return {
        label: 'Corrected absorbance',
        value: sampleAbsorbance - blankAbsorbance,
        unit: 'AU'
      };
    }

    if (method.type === 'transmittance-absorbance') {
      if (transmittance <= 0) return null;
      return {
        label: 'Calculated absorbance',
        value: -Math.log10(transmittance / 100),
        unit: 'AU'
      };
    }

    return null;
  };

  const printProjectMethodReport = async () => {
    if (!openedProject || !selectedMethod) return;

    if (selectedMethod.type === 'calibration-curve') {
      setActiveTab('linear-regression');
      return;
    }

    const inputs: { label: string; value: string }[] = [];
    let resultLabel = 'Result';
    let resultValue: number | null = null;
    let resultUnit = '';

    if (selectedMethod.type === 'custom-formula') {
      const result = evaluateCustomFormula(selectedMethod.expression, customFormulaInputs, selectedMethod.constants);
      resultLabel = 'Formula Result';
      resultValue = result.value;
      resultUnit = selectedMethod.resultUnit ?? '';
      inputs.push(...result.variables.map((variable) => ({
        label: variable,
        value: customFormulaInputs[variable] ?? ''
      })));
      inputs.push(...(selectedMethod.constants ?? []).map((constant) => ({
        label: `${constant.name} (constant)`,
        value: String(constant.value)
      })));
    } else {
      const result = calculateProjectMethod(selectedMethod);
      resultLabel = result?.label ?? 'Result';
      resultValue = result?.value ?? null;
      resultUnit = result?.unit ?? '';

      if (selectedMethod.type === 'direct-proportion') {
        inputs.push(
          { label: 'Sample absorbance', value: methodInputs.sampleAbsorbance },
          { label: 'Standard absorbance', value: methodInputs.standardAbsorbance },
          { label: 'Standard concentration', value: methodInputs.standardConcentration },
          { label: 'Concentration unit', value: methodInputs.concentrationUnit }
        );
      }

      if (selectedMethod.type === 'blank-correction') {
        inputs.push(
          { label: 'Sample absorbance', value: methodInputs.sampleAbsorbance },
          { label: 'Blank absorbance', value: methodInputs.blankAbsorbance }
        );
      }

      if (selectedMethod.type === 'transmittance-absorbance') {
        inputs.push({ label: 'Transmittance (%)', value: methodInputs.transmittance });
      }
    }

    const isAbsorbanceResult = selectedMethod.type === 'blank-correction' || selectedMethod.type === 'transmittance-absorbance';
    const sampleAbsorbanceForReport = parseDecimal(methodInputs.sampleAbsorbance);
    const numericResultValue = resultValue ?? 0;
    const completedReportPayload = buildReportPayload(
      currentUser,
      {
        compoundName: `${openedProject.compound} - ${selectedMethod.name}`,
        casId: openedProject.id,
        lambdaMax: openedProject.wavelength || 'N/A',
        solvent: openedProject.matrix || 'N/A',
        source: selectedMethod.type,
        epsilonValue: 0,
        pathLengthValue: 0,
        concentrationValue: isAbsorbanceResult ? 0 : numericResultValue,
        absorbance: isAbsorbanceResult ? numericResultValue : sampleAbsorbanceForReport || numericResultValue
      },
      {
        projectId: openedProject.id,
        projectName: openedProject.compound
      }
    );

    const registered = await registerCompletedAnalysis(completedReportPayload);
    if (!registered) return;

    void recordAnalysisStep({
      ...getMethodAuditContext('Project Method'),
      fieldKey: 'project_method_report',
      fieldLabel: 'Project method report',
      previousValue: 'Pending',
      nextValue: resultValue === null ? 'No numeric result' : `${formatNumber(resultValue)} ${resultUnit}`.trim(),
      stepDescription: `Generated project method report for ${openedProject.compound} / ${selectedMethod.name}.`
    });
    startNextAnalysisRun();

    openPrintableProjectMethodReport({
      currentUser,
      project: openedProject,
      method: selectedMethod,
      resultLabel,
      resultValue,
      resultUnit,
      inputs
    });
  };

  const removePoint = (index: number) => {
    setRegressionPoints(regressionPoints.filter((_, i) => i !== index));
  };

  const togglePointActive = (index: number) => {
    const activeCount = regressionPoints.filter(p => p.active).length;
    // Se tentar desativar e já estiver no limite de 5, bloqueia (a menos que o total seja < 5)
    if (regressionPoints[index].active && activeCount <= 5 && regressionPoints.length >= 5) {
      return;
    }
    const newPoints = [...regressionPoints];
    newPoints[index].active = !newPoints[index].active;
    setRegressionPoints(newPoints);
  };

  const calculateRegression = () => {
    const validPoints = regressionPoints
      .filter(p => p.active && !isNaN(parseFloat(p.x)) && !isNaN(parseFloat(p.y)))
      .map(p => ({ x: parseFloat(p.x), y: parseFloat(p.y) }));

    if (validPoints.length < 5) return null;

    const n = validPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (const p of validPoints) {
      sumX += p.x; sumY += p.y; sumXY += p.x * p.y;
      sumX2 += p.x * p.x; sumY2 += p.y * p.y;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const rNum = n * sumXY - sumX * sumY;
    const rDen = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r2 = rDen !== 0 ? Math.pow(rNum / rDen, 2) : 0;

    return { slope, intercept, r2, points: validPoints };
  };

  const getRegressionSampleEvaluation = () => {
    const results = calculateRegression();
    const sampleAbsorbance = Number.parseFloat(sampleY.replace(',', '.'));
    const dilution = Math.max(1, parseDecimal(regressionSampleDilution) || 1);

    if (!results || Number.isNaN(sampleAbsorbance) || results.slope === 0) {
      return {
        results,
        sampleAbsorbance,
        dilution,
        curveMaxY: null as number | null,
        isAboveCalibrationRange: false,
        dilutedConcentration: null as number | null,
        finalConcentration: null as number | null
      };
    }

    const curveMaxY = Math.max(...results.points.map((point) => point.y));
    const dilutedConcentration = (sampleAbsorbance - results.intercept) / results.slope;
    const isAboveCalibrationRange = sampleAbsorbance > curveMaxY;

    return {
      results,
      sampleAbsorbance,
      dilution,
      curveMaxY,
      isAboveCalibrationRange,
      dilutedConcentration,
      finalConcentration: isAboveCalibrationRange ? null : dilutedConcentration * dilution
    };
  };

  // Synchronizes sample absorbance based on the selected wavelength from the scan.
  useEffect(() => {
    if (skipNextSampleScanSyncRef.current) {
      skipNextSampleScanSyncRef.current = false;
      return;
    }

    const targetNum = Number.parseFloat(targetWavelength.replace(',', '.'));
    if (isNaN(targetNum)) return;

    const entries = Object.entries(scanMap);
    if (entries.length === 0) return;

    let closestAbs = "";
    let minDiff = Number.POSITIVE_INFINITY;

    for (const [wlStr, absVal] of entries) {
      const wlNum = Number.parseFloat(wlStr.replace(',', '.'));
      const diff = Math.abs(wlNum - targetNum);
      if (diff < minDiff) {
        minDiff = diff;
        closestAbs = absVal;
      }
    }

    // 1 nm tolerance to cover rounding differences across equipment.
    if (minDiff <= 1.0) {
      setAbsSample(closestAbs.replace(',', '.'));
    }
  }, [targetWavelength, scanMap]);

  const sampleVal = Number.parseFloat(absSample.toString().replace(',', '.')) || 0;
  const blankVal = Number.parseFloat(absBlank.toString().replace(',', '.')) || 0;
  const epsVal = Number.parseFloat(epsilon.toString().replace(',', '.')) || 0;
  const pathVal = Number.parseFloat(pathLength.toString().replace(',', '.')) || 0;
  const dilVal = Number.parseFloat(dilutionFactor.toString().replace(',', '.')) || 1;
  const inputConcVal = Number.parseFloat(inputConcentration.toString().replace(',', '.')) || 0;
  const scanPoints = useMemo(() => Object.entries(scanMap)
    .map(([wavelength, absorbance]) => ({
      wavelength: Number.parseFloat(wavelength.replace(',', '.')),
      absorbance: Number.parseFloat(absorbance.replace(',', '.'))
    }))
    .filter((point) => Number.isFinite(point.wavelength) && Number.isFinite(point.absorbance))
    .sort((left, right) => left.wavelength - right.wavelength), [scanMap]);

  const formatScanInputValue = (value: number) => (
    Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/\.?0+$/, '')
  );

  const applyLambertScanPoint = (point: { wavelength: number; absorbance: number }) => {
    const nextWavelength = formatScanInputValue(point.wavelength);
    const nextAbsorbance = formatScanInputValue(point.absorbance);

    setTargetWavelength(nextWavelength);
    void recordAnalysisStep({
      ...getMethodAuditContext('Lambert-Beer'),
      fieldKey: 'selected_scan_point',
      fieldLabel: 'Selected scan point',
      previousValue: targetWavelength || 'No point selected',
      nextValue: `${nextWavelength} nm / ${nextAbsorbance} AU`,
      stepDescription: `Selected spectral point at ${nextWavelength} nm with absorbance ${nextAbsorbance}.`
    });

    if (calcMode === 'concentration' && lambertSerialTargetRef.current === 'blank') {
      skipNextSampleScanSyncRef.current = true;
      setAbsBlank(nextAbsorbance);
      return;
    }

    setAbsSample(nextAbsorbance);
  };

  const effectiveAbs = sampleVal - blankVal;

  const resultConcentration = (epsVal * pathVal) !== 0 ? (effectiveAbs / (epsVal * pathVal)) * dilVal : 0;
  const resultAbsorbance = epsVal * pathVal * (inputConcVal / dilVal);

  const finalResult = calcMode === 'concentration' ? resultConcentration : resultAbsorbance;

  // Generates the printable report without saving a database snapshot.
  const printLambertReport = async () => {
    const payload = buildReportPayload(
      currentUser,
      {
        compoundName: 'Lambert-Beer Analysis',
        casId: 'N/A',
        lambdaMax: targetWavelength || 'N/A',
        solvent: 'N/A',
        source: 'Manual',
        epsilonValue: epsVal,
        pathLengthValue: pathVal,
        concentrationValue: calcMode === 'concentration' ? finalResult : inputConcVal,
        absorbance: calcMode === 'absorbance' ? finalResult : effectiveAbs
      },
      returnTargetProject
        ? {
            projectId: returnTargetProject.id,
            projectName: returnTargetProject.compound
          }
        : undefined
    );

    const registered = await registerCompletedAnalysis(payload);
    if (!registered) return;

    void recordAnalysisStep({
      ...getMethodAuditContext('Lambert-Beer'),
      fieldKey: 'lambert_beer_report',
      fieldLabel: 'Lambert-Beer report',
      previousValue: 'Pending',
      nextValue: `${formatNumber(finalResult)} ${calcMode === 'concentration' ? 'mol/L' : 'AU'}`,
      stepDescription: `Generated Lambert-Beer report using mode ${calcMode}.`
    });
    startNextAnalysisRun();

    openPrintableReport(payload);
  };

  const printCalibrationReport = async () => {
    const sampleEvaluation = getRegressionSampleEvaluation();
    const results = sampleEvaluation.results;

    if (!results) {
      window.alert('Add at least 5 active valid points before printing a calibration report.');
      return;
    }

    if (sampleEvaluation.isAboveCalibrationRange) {
      window.alert('Sample absorbance is above the calibration curve range. Dilute the sample and enter a new in-range reading before printing the report.');
      return;
    }

    const completedReportPayload = buildReportPayload(
      currentUser,
      {
        compoundName: 'Linear Regression Calibration',
        casId: 'CAL-CURVE',
        lambdaMax: 'N/A',
        solvent: 'N/A',
        source: 'Calibration Curve',
        epsilonValue: results.slope,
        pathLengthValue: sampleEvaluation.dilution,
        concentrationValue: sampleEvaluation.finalConcentration ?? 0,
        absorbance: Number.isNaN(sampleEvaluation.sampleAbsorbance) ? 0 : sampleEvaluation.sampleAbsorbance
      },
      returnTargetProject
        ? {
            projectId: returnTargetProject.id,
            projectName: returnTargetProject.compound
          }
        : undefined
    );

    const registered = await registerCompletedAnalysis(completedReportPayload);
    if (!registered) return;

    void recordAnalysisStep({
      ...getMethodAuditContext('Linear Regression'),
      fieldKey: 'calibration_report',
      fieldLabel: 'Calibration report',
      previousValue: 'Pending',
      nextValue: sampleEvaluation.finalConcentration === null ? 'No concentration calculated' : `${sampleEvaluation.finalConcentration.toFixed(6)} mol/L`,
      stepDescription: `Generated calibration report with ${results.points.length} active points and R2 ${results.r2.toFixed(6)}.`
    });
    startNextAnalysisRun();

    openPrintableCalibrationReport({
      currentUser,
      slope: results.slope,
      intercept: results.intercept,
      r2: results.r2,
      points: results.points,
      sampleAbsorbance: Number.isNaN(sampleEvaluation.sampleAbsorbance) ? null : sampleEvaluation.sampleAbsorbance,
      calculatedConcentration: sampleEvaluation.finalConcentration,
      dilutionFactor: sampleEvaluation.dilution
    });
  };

  // Clears all calculator fields.
  const resetCalculator = () => {
    setAbsSample('0');
    setAbsBlank('0');
    setEpsilon('0');
    setPathLength('1');
    setDilutionFactor('1');
    setInputConcentration('0');
    setTargetWavelength('');
    setScanMap({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Processes scan text data (Wavelength Absorbance).
  const processDataStream = (text: string, clearFirst = false) => {
    const lines = text.split(/\r?\n/);
    const newScanMap: Record<string, string> = {};
    let foundCount = 0;
    
    lines.forEach(line => {
      // Removes quotes and extra spaces.
      const cleanLine = line.replace(/"/g, '').trim();
      // Captures two numbers separated by space, tab, comma, semicolon or pipe.
      // Accepts the "Wavelength | Absorbance" format from the equipment.
      const matches = cleanLine.match(/(\d{3,4}(?:[.,]\d+)?)[,\s\t;|]+([-+]?\d+[.,]?\d*)/);
      
      if (matches && matches.length >= 3) {
        const wavelength = matches[1].replace(',', '.');
        const absorbance = matches[2].replace(',', '.');
        
        const wlNum = parseFloat(wavelength);
        const absNum = parseFloat(absorbance);
        // Filters valid wavelengths and avoids capturing header ranges.
        if (wlNum >= 190 && wlNum <= 1100 && absNum < 10) {
          newScanMap[wavelength] = absorbance;
          foundCount++;
        }
      }
    });

    if (clearFirst) {
      setScanMap(newScanMap);
    } else {
      setScanMap(prev => ({ ...prev, ...newScanMap }));
    }
    if (foundCount > 0) {
      void recordAnalysisStep({
        ...getMethodAuditContext('Lambert-Beer'),
        fieldKey: 'spectral_scan_import',
        fieldLabel: 'Spectral scan import',
        previousValue: clearFirst ? 'Previous scan replaced' : 'Existing scan retained',
        nextValue: `${foundCount} readings`,
        stepDescription: `Imported ${foundCount} wavelength/absorbance readings for Lambert-Beer analysis.`
      });
    }
    return { count: foundCount, map: newScanMap };
  };

  // Web Serial API Logic
  const connectSerial = async () => {
    if (!('serial' in navigator)) {
      alert('Web Serial API not supported in this browser. Use Chrome or Edge.');
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setIsSerialConnected(true);

      const reader = port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const text = new TextDecoder().decode(value);
          
          const val = extractEquipmentReadingValue(text);

          if (activeTabRef.current === 'lambert-beer') {
            const { count } = processDataStream(text);
            if (count === 0 && val) {
              if (lambertSerialTargetRef.current === 'blank') {
                setAbsBlank(val);
                void recordAnalysisStep({
                  ...getMethodAuditContext('Lambert-Beer'),
                  fieldKey: 'blank_absorbance',
                  fieldLabel: 'Blank absorbance',
                  previousValue: absBlank,
                  nextValue: val,
                  stepDescription: `Captured blank absorbance from hardware: ${val}.`
                });
              } else {
                setAbsSample(val);
                void recordAnalysisStep({
                  ...getMethodAuditContext('Lambert-Beer'),
                  fieldKey: 'sample_absorbance',
                  fieldLabel: 'Sample absorbance',
                  previousValue: absSample,
                  nextValue: val,
                  stepDescription: `Captured sample absorbance from hardware: ${val}.`
                });
              }
            }
          } else if (activeTabRef.current === 'linear-regression') {
            // Na regressão, geralmente recebemos um valor por vez do equipamento
            if (val) {
              if (regressionSerialTargetRef.current === 'sample') {
                setSampleY(val);
                void recordAnalysisStep({
                  ...getMethodAuditContext('Linear Regression'),
                  fieldKey: 'sample_absorbance',
                  fieldLabel: 'Sample absorbance',
                  previousValue: sampleY,
                  nextValue: val,
                  stepDescription: `Captured sample response from hardware: ${val}.`
                });
              } else {
                setNewY(val);
                void recordAnalysisStep({
                  ...getMethodAuditContext('Linear Regression'),
                  fieldKey: 'calibration_point_response',
                  fieldLabel: 'Calibration point response',
                  previousValue: newY,
                  nextValue: val,
                  stepDescription: `Captured calibration point response from hardware: ${val}.`
                });
              }
            }
          } else if (activeTabRef.current === 'library' && val) {
            applyProjectHardwareReading(val);
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err) {
      console.error('Serial Connection Error:', err);
      setIsSerialConnected(false);
    }
  };

  const disconnectSerial = async () => {
    if (portRef.current) {
      await portRef.current.close();
      portRef.current = null;
      setIsSerialConnected(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    const applyImportedAbsorbance = (value: string) => {
      if (calcMode === 'concentration' && lambertSerialTargetRef.current === 'blank') {
        skipNextSampleScanSyncRef.current = true;
        setAbsBlank(value);
        void recordAnalysisStep({
          ...getMethodAuditContext('Lambert-Beer'),
          fieldKey: 'blank_absorbance',
          fieldLabel: 'Blank absorbance',
          previousValue: absBlank,
          nextValue: value,
          stepDescription: `Imported blank absorbance reading: ${value}.`
        });
        return;
      }

      setAbsSample(value);
      void recordAnalysisStep({
        ...getMethodAuditContext('Lambert-Beer'),
        fieldKey: 'sample_absorbance',
        fieldLabel: 'Sample absorbance',
        previousValue: absSample,
        nextValue: value,
        stepDescription: `Imported sample absorbance reading: ${value}.`
      });
    };

    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const { count, map } = processDataStream(text, true); 
      
      if (count > 0) {
        // Auto-detects the peak lambda max to simplify setup.
        const entries = Object.entries(map);
        const peak = entries.reduce((prev, curr) => 
          parseFloat(curr[1]) > parseFloat(prev[1]) ? curr : prev
        );
        
        setTargetWavelength(peak[0]);
        applyImportedAbsorbance(peak[1]);
      } else {
        // Fallback: extracts an isolated decimal value that looks like absorbance.
        // Improved to avoid large IDs, for example 2000.
        const numericMatch = text.match(/(?<!\d)[0-2][.,]\d{2,6}(?!\d)/);
        if (numericMatch) applyImportedAbsorbance(numericMatch[0].replace(',', '.'));
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleRegressionFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/);
      const newPoints: { x: string, y: string, active: boolean }[] = [];
      
      lines.forEach(line => {
        const cleanLine = line.replace(/"/g, '').trim();
        // Captures two numbers separated by common delimiters.
        const matches = cleanLine.match(/([-+]?\d+[.,]?\d*)[,\s\t;|]+([-+]?\d+[.,]?\d*)/);
        
        if (matches && matches.length >= 3) {
          const x = matches[1].replace(',', '.');
          const y = matches[2].replace(',', '.');
          if (!isNaN(parseFloat(x)) && !isNaN(parseFloat(y))) {
            newPoints.push({ x, y, active: true });
          }
        }
      });

      if (newPoints.length > 0) {
        setRegressionPoints(prev => [...prev, ...newPoints]);
        void recordAnalysisStep({
          ...getMethodAuditContext('Linear Regression'),
          fieldKey: 'calibration_points_import',
          fieldLabel: 'Calibration points import',
          previousValue: `${regressionPoints.length} points`,
          nextValue: `${regressionPoints.length + newPoints.length} points`,
          stepDescription: `Imported ${newPoints.length} calibration points for linear regression.`
        });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = ''; // Resets the input to allow re-uploading the same file.
  };

  return (
    <div ref={pageRootRef} className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">{text.sop}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">{text.title}</h1>
          <p className="text-white/40 mt-1 max-w-2xl text-sm leading-relaxed">{text.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={openLibraryRoot}
          className={`px-5 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
            activeTab === 'library'
              ? 'bg-primary text-on-primary border-primary shadow-[0_0_30px_rgba(167,200,255,0.2)]'
              : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.08]'
          }`}
        >
          {text.projectLibrary}
        </button>
        <button
          onClick={() => openCalculatorTab('lambert-beer')}
          className={`px-5 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
            activeTab === 'lambert-beer'
              ? 'bg-primary text-on-primary border-primary shadow-[0_0_30px_rgba(167,200,255,0.2)]'
              : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.08]'
          }`}
        >
          Lambert-Beer Calc
        </button>
        <button
          onClick={() => openCalculatorTab('linear-regression')}
          className={`px-5 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
            activeTab === 'linear-regression'
              ? 'bg-primary text-on-primary border-primary shadow-[0_0_30px_rgba(167,200,255,0.2)]'
              : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.08]'
          }`}
        >
          Linear Regression
        </button>
      </div>

      {activeTab === 'library' ? (
        openedProject ? (
          projectMode === 'method-builder' ? (
          <div className="space-y-5">
            <section className="glass-panel rounded-2xl p-5 border-white/[0.03]">
              <div className="flex items-start gap-4">
                <button
                  onClick={closeMethodBuilder}
                  className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white/45 hover:text-white hover:bg-white/[0.08] transition-all"
                  title={text.backToProject}
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary font-bold">{text.formulaBuilderTitle}</p>
                  <h2 className="text-2xl font-display font-bold text-white mt-2">{openedProject.compound}</h2>
                  <p className="text-sm text-white/45 mt-2 max-w-3xl leading-relaxed">
                    Create a custom calculation method with variables, time sequences, blank readings and constants.
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl p-5 space-y-5 border-primary/10">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
                <label className="block space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.methodName}</span>
                  <input
                    value={newMethodName}
                    onChange={(event) => setNewMethodName(event.target.value)}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40 placeholder:text-white/25"
                    placeholder="Ex: Kinetic absorbance correction"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.calculationType}</span>
                  <select
                    value={newMethodType}
                    onChange={(event) => setNewMethodType(event.target.value as ProjectMethodType)}
                    className="w-full rounded-xl bg-[#08101f] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40"
                  >
                    {methodTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.formula}</span>
                <textarea
                  value={newMethodType === 'custom-formula' ? newMethodExpression : selectedMethodType.expression}
                  onChange={(event) => setNewMethodExpression(event.target.value)}
                  disabled={newMethodType !== 'custom-formula'}
                  rows={4}
                  className="w-full resize-none rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40 placeholder:text-white/25 disabled:text-white/45 disabled:cursor-not-allowed"
                  placeholder="Ex: result = (Abs_2s - Blank_2s) * Factor"
                />
                {newMethodType === 'custom-formula' && (
                  <p className="text-[10px] text-white/35 leading-relaxed">
                    Use variables without spaces. Constants saved below can be inserted in the formula but will not become unknown inputs.
                  </p>
                )}
              </label>

              {newMethodType === 'custom-formula' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 space-y-5">
                  <label className="block space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.resultUnit}</span>
                    <input
                      value={newMethodResultUnit}
                      onChange={(event) => setNewMethodResultUnit(event.target.value)}
                      className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40 placeholder:text-white/25"
                      placeholder="mg/L, mol/L, AU/min, %, ppm..."
                    />
                  </label>

                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">{text.formulaBuilder}</p>
                      <p className="text-sm text-white/45 mt-2 leading-relaxed">
                        Create variables for equipment readings, time sequences and constants, then click them to assemble the formula.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['+', '-', '*', '/', '^', '(', ')'].map((operator) => (
                        <button
                          key={operator}
                          onClick={() => appendFormulaToken(operator)}
                          className="h-9 min-w-9 rounded-lg bg-white/[0.05] border border-white/10 px-3 text-sm font-mono text-white/70 hover:text-primary hover:border-primary/25 transition-all"
                        >
                          {operator}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 space-y-3">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/35">{text.singleVariable}</p>
                      <div className="flex gap-2">
                        <input
                          value={newVariableName}
                          onChange={(event) => setNewVariableName(event.target.value)}
                          className="w-full rounded-lg bg-[#08101f] border border-white/10 px-3 py-2 text-white outline-none focus:border-primary/40 placeholder:text-white/25"
                          placeholder="Abs_0s, Blank, A_sample"
                        />
                        <button onClick={() => addFormulaBuilderVariable(newVariableName)} className="px-3 rounded-lg bg-primary text-on-primary" title={text.addVariable}>
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 space-y-3">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/35">{text.timeSequence}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input value={sequencePrefix} onChange={(event) => setSequencePrefix(event.target.value)} className="rounded-lg bg-[#08101f] border border-white/10 px-3 py-2 text-white outline-none focus:border-primary/40" placeholder="Abs" />
                        <input type="number" value={sequenceStart} onChange={(event) => setSequenceStart(event.target.value)} className="rounded-lg bg-[#08101f] border border-white/10 px-3 py-2 text-white outline-none focus:border-primary/40" placeholder="0" />
                        <input type="number" value={sequenceStep} onChange={(event) => setSequenceStep(event.target.value)} className="rounded-lg bg-[#08101f] border border-white/10 px-3 py-2 text-white outline-none focus:border-primary/40" placeholder="1" />
                        <input type="number" value={sequenceCount} onChange={(event) => setSequenceCount(event.target.value)} className="rounded-lg bg-[#08101f] border border-white/10 px-3 py-2 text-white outline-none focus:border-primary/40" placeholder="3" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => addFormulaBuilderSequence()} className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-primary hover:text-on-primary transition-all">{text.addSequence}</button>
                        <button onClick={() => addFormulaBuilderSequence('Blank')} className="rounded-lg bg-secondary/10 border border-secondary/20 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-secondary hover:bg-secondary hover:text-on-secondary transition-all">{text.blankSequence}</button>
                      </div>
                      <p className="text-[10px] text-white/30">{text.sequenceHint}</p>
                    </div>

                    <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 space-y-3">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/35">{text.constants}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                        <input value={newConstantName} onChange={(event) => setNewConstantName(event.target.value)} className="rounded-lg bg-[#08101f] border border-white/10 px-3 py-2 text-white outline-none focus:border-primary/40 placeholder:text-white/25" placeholder="Factor" />
                        <input type="number" step="any" value={newConstantValue} onChange={(event) => setNewConstantValue(event.target.value)} className="rounded-lg bg-[#08101f] border border-white/10 px-3 py-2 text-white outline-none focus:border-primary/40 placeholder:text-white/25" placeholder="10" />
                        <button onClick={addFormulaBuilderConstant} className="px-3 rounded-lg bg-primary text-on-primary" title={text.addConstant}>
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/35 mb-3">{text.variables}</p>
                      <div className="flex flex-wrap gap-2">
                        {formulaBuilderVariables.length ? formulaBuilderVariables.map((variable) => (
                          <button key={variable} onClick={() => appendFormulaToken(variable)} className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-primary hover:text-on-primary transition-all">
                            {variable}
                          </button>
                        )) : (
                          <span className="text-sm text-white/35">{text.noVariables}</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/35 mb-3">{text.savedConstants}</p>
                      <div className="flex flex-wrap gap-2">
                        {formulaBuilderConstants.length ? formulaBuilderConstants.map((constant) => (
                          <button key={constant.name} onClick={() => appendFormulaToken(constant.name)} className="rounded-lg border border-secondary/20 bg-secondary/10 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-secondary hover:bg-secondary hover:text-on-secondary transition-all" title={`${constant.name} = ${constant.value}`}>
                            {constant.name} = {constant.value}
                          </button>
                        )) : (
                          <span className="text-sm text-white/35">{text.noConstants}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={createCustomMethod} disabled={newMethodType === 'custom-formula' && !newMethodExpression.trim()} className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(167,200,255,0.25)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <Plus size={16} />
                  Add Method
                </button>
                <button onClick={closeMethodBuilder} className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/[0.04] border border-white/10 text-white/55 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white/[0.08] hover:text-white transition-all">
                  Cancel
                </button>
              </div>
            </section>
          </div>
          ) : (
          <div className="space-y-5">
            <section className="space-y-5">
              <div className="glass-panel rounded-2xl p-5 border-white/[0.03]">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => setOpenedProjectId(null)}
                      className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white/45 hover:text-white hover:bg-white/[0.08] transition-all"
                      title={text.backToProjectList}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">{text.workspace}</p>
                      <h2 className="text-2xl font-display font-bold text-white mt-2">{openedProject.compound}</h2>
                      <p className="text-sm text-white/45 mt-2 max-w-2xl leading-relaxed">{openedProject.description}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-mono uppercase tracking-widest">
                    {openedProject.methods.length} methods
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                <div className="glass-panel rounded-2xl p-5 border-white/[0.03] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-white font-display font-bold">{text.projectMethods}</h3>
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{text.selectOne}</span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {openedProject.methods.map((method) => {
                      const isActive = selectedMethod?.id === method.id;
                      const methodType = methodTypeOptions.find((option) => option.value === method.type);

                      return (
                        <button
                          key={method.id}
                          onClick={() => selectProjectMethod(method)}
                          className={`w-full text-left rounded-xl border p-4 transition-all ${
                            isActive
                              ? 'bg-primary/10 border-primary/25'
                              : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/12'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-white font-semibold break-words">{method.name}</p>
                              <p className="text-[10px] font-mono text-primary/80 mt-2 break-words">{method.expression}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Calculator size={16} className={isActive ? 'text-primary' : 'text-white/25'} />
                              <span
                                role="button"
                                tabIndex={0}
                                title={text.deleteMethod}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteProjectMethod(openedProject.id, method.id);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    deleteProjectMethod(openedProject.id, method.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-white/20 hover:text-red-300 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 size={15} />
                              </span>
                            </div>
                          </div>
                          <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mt-3">
                            {methodType?.label ?? 'Custom method'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-5 border-primary/10 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary font-bold">{text.methodRunner}</p>
                      <h3 className="text-xl font-display font-bold text-white mt-2">{selectedMethod?.name ?? 'No method selected'}</h3>
                      <p className="text-sm text-white/45 mt-2 break-words">{selectedMethod?.expression ?? 'Create or select a method to start.'}</p>
                    </div>
                    {selectedMethod?.tab && (
                      <button
                        onClick={openSelectedMethodAdvanced}
                        className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-on-primary text-[10px] font-mono uppercase tracking-widest transition-all"
                      >
                        {getMethodTargetTab(selectedMethod) === 'linear-regression' ? 'Open Linear Regression' : 'Advanced'}
                      </button>
                    )}
                  </div>

                  {selectedMethod && selectedMethod.type !== 'calibration-curve' && projectReadingTargets.length > 0 && (
                    <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.equipmentTarget}</p>
                          <p className="text-xs text-white/35 mt-1">{text.equipmentTargetHint}</p>
                        </div>
                        <button
                          onClick={isSerialConnected ? disconnectSerial : connectSerial}
                          title={isSerialConnected ? text.disconnectEquipment : text.connectEquipment}
                          className={`px-4 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest ${
                            isSerialConnected
                              ? 'bg-green-500/10 border-green-500/30 text-green-400'
                              : 'bg-white/[0.03] border-white/10 text-white/45 hover:text-white hover:bg-white/[0.06]'
                          }`}
                        >
                          {isSerialConnected ? <Unlink size={16} /> : <Link size={16} />}
                          {isSerialConnected ? 'Online' : 'Hardware'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {projectReadingTargets.map((target) => (
                          <button
                            key={target.value}
                            onClick={() => setProjectSerialTarget(target.value)}
                            className={`px-3 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em] transition-all border break-words ${
                              projectSerialTarget === target.value
                                ? 'bg-primary text-on-primary border-primary'
                                : 'bg-white/[0.03] text-white/45 border-white/10 hover:text-white hover:bg-white/[0.06]'
                            }`}
                          >
                            {target.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedMethod && getMethodTargetTab(selectedMethod) === 'linear-regression' && selectedMethod.type === 'calibration-curve' ? (
                    <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-6 text-sm text-white/55 leading-relaxed">
                      {text.regressionCalculator}. {text.sampleQuantification}.
                    </div>
                  ) : selectedMethod?.type === 'custom-formula' ? (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/35">{text.recognizedVariables}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {customFormulaResult?.variables.length ? customFormulaResult.variables.map((variable) => (
                            <span key={variable} className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-primary">
                              {variable}
                            </span>
                          )) : (
                            <span className="text-sm text-white/35">{text.noRecognizedVariables}</span>
                          )}
                        </div>
                      </div>

                      {customFormulaResult?.variables.length ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {customFormulaResult.variables.map((variable) => (
                            <label key={variable} className="block space-y-2">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{variable}</span>
                              <input
                                type="number"
                                step="any"
                                value={customFormulaInputs[variable] ?? ''}
                                onChange={(event) => updateCustomFormulaInput(variable, event.target.value)}
                                onFocus={() => markAnalysisFieldStart(`custom_${variable}`, customFormulaInputs[variable] ?? '')}
                                onBlur={(event) => commitAnalysisFieldChange(`custom_${variable}`, variable, event.target.value, 'Project Method', `Updated custom formula variable ${variable}.`)}
                                className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40"
                                placeholder="0.000"
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}

                      <div className="rounded-2xl bg-secondary/10 border border-secondary/20 p-5">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-secondary font-bold">
                          Formula Result
                        </p>
                        <p className="text-3xl font-display font-bold text-white mt-3">
                          {customFormulaResult?.value !== null && customFormulaResult?.value !== undefined ? formatNumber(customFormulaResult.value) : '---'}
                          {selectedMethod.resultUnit && (
                            <span className="text-sm font-mono text-white/40 ml-2">{selectedMethod.resultUnit}</span>
                          )}
                        </p>
                        {customFormulaResult?.error && (
                          <p className="text-xs text-white/45 mt-3">{customFormulaResult.error}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(selectedMethod?.type === 'direct-proportion' || selectedMethod?.type === 'blank-correction') && (
                          <label className="block space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.sampleAbsorbance}</span>
                            <input
                              type="number"
                              step="any"
                              value={methodInputs.sampleAbsorbance}
                              onChange={(event) => updateMethodInput('sampleAbsorbance', event.target.value)}
                              onFocus={() => markAnalysisFieldStart('sampleAbsorbance', methodInputs.sampleAbsorbance)}
                              onBlur={(event) => commitAnalysisFieldChange('sampleAbsorbance', text.sampleAbsorbance, event.target.value, 'Project Method', 'Updated project method sample absorbance.')}
                              className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40"
                              placeholder="0.000"
                            />
                          </label>
                        )}

                        {selectedMethod?.type === 'direct-proportion' && (
                          <>
                            <label className="block space-y-2">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.standardAbsorbance}</span>
                              <input
                                type="number"
                                step="any"
                                value={methodInputs.standardAbsorbance}
                                onChange={(event) => updateMethodInput('standardAbsorbance', event.target.value)}
                                onFocus={() => markAnalysisFieldStart('standardAbsorbance', methodInputs.standardAbsorbance)}
                                onBlur={(event) => commitAnalysisFieldChange('standardAbsorbance', text.standardAbsorbance, event.target.value, 'Project Method', 'Updated project method standard absorbance.')}
                                className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40"
                                placeholder="0.000"
                              />
                            </label>
                            <label className="block space-y-2">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.standardConcentration}</span>
                              <input
                                type="number"
                                step="any"
                                value={methodInputs.standardConcentration}
                                onChange={(event) => updateMethodInput('standardConcentration', event.target.value)}
                                onFocus={() => markAnalysisFieldStart('standardConcentration', methodInputs.standardConcentration)}
                                onBlur={(event) => commitAnalysisFieldChange('standardConcentration', text.standardConcentration, event.target.value, 'Project Method', 'Updated project method standard concentration.')}
                                className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40"
                                placeholder="0.000"
                              />
                            </label>
                            <label className="block space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.sampleConcentrationUnit}</span>
                              <input
                                value={methodInputs.concentrationUnit}
                                onChange={(event) => updateMethodInput('concentrationUnit', event.target.value)}
                                onFocus={() => markAnalysisFieldStart('concentrationUnit', methodInputs.concentrationUnit)}
                                onBlur={(event) => commitAnalysisFieldChange('concentrationUnit', text.sampleConcentrationUnit, event.target.value, 'Project Method', 'Updated project method concentration unit.')}
                                className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40"
                                placeholder="mg/L, mol/L, ppm..."
                              />
                            </label>
                          </>
                        )}

                        {selectedMethod?.type === 'blank-correction' && (
                          <label className="block space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.blankAbsorbance}</span>
                            <input
                              type="number"
                              step="any"
                              value={methodInputs.blankAbsorbance}
                              onChange={(event) => updateMethodInput('blankAbsorbance', event.target.value)}
                              onFocus={() => markAnalysisFieldStart('blankAbsorbance', methodInputs.blankAbsorbance)}
                              onBlur={(event) => commitAnalysisFieldChange('blankAbsorbance', text.blankAbsorbance, event.target.value, 'Project Method', 'Updated project method blank absorbance.')}
                              className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40"
                              placeholder="0.000"
                            />
                          </label>
                        )}

                        {selectedMethod?.type === 'transmittance-absorbance' && (
                          <label className="block space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.transmittance}</span>
                            <input
                              type="number"
                              step="any"
                              value={methodInputs.transmittance}
                              onChange={(event) => updateMethodInput('transmittance', event.target.value)}
                              onFocus={() => markAnalysisFieldStart('transmittance', methodInputs.transmittance)}
                              onBlur={(event) => commitAnalysisFieldChange('transmittance', text.transmittance, event.target.value, 'Project Method', 'Updated project method transmittance.')}
                              className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40"
                              placeholder="100"
                            />
                          </label>
                        )}
                      </div>

                      {(() => {
                        const result = calculateProjectMethod(selectedMethod);

                        return (
                          <div className="rounded-2xl bg-secondary/10 border border-secondary/20 p-5">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-secondary font-bold">
                              {result?.label ?? text.calculationResult}
                            </p>
                            <p className="text-3xl font-display font-bold text-white mt-3">
                              {result ? formatNumber(result.value) : '---'}
                              <span className="text-sm font-mono text-white/40 ml-2">{result?.unit ?? ''}</span>
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {selectedMethod && selectedMethod.type !== 'calibration-curve' && (
                    <button
                      onClick={printProjectMethodReport}
                      className="w-full py-4 bg-white/5 border border-white/10 text-white/60 text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-white/[0.08] hover:text-white transition-all rounded-xl flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      {text.printMethodReport}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl p-5 border-primary/10">
              <button
                onClick={openMethodBuilder}
                className="w-full py-4 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(167,200,255,0.25)] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {text.createCustomMethod}
              </button>
            </section>
          </div>
          )
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <section className="glass-panel rounded-2xl border-white/[0.03] overflow-hidden">
            <div className="p-5 border-b border-white/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">{text.projectLibrary}</p>
                <h2 className="text-xl font-display font-bold text-white mt-2">{text.compoundProjects}</h2>
              </div>
              <label className="relative w-full lg:w-[340px]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary/40 placeholder:text-white/25"
                  placeholder={text.searchProjects}
                />
              </label>
            </div>

            <div className="max-h-[460px] overflow-y-auto custom-scrollbar divide-y divide-white/[0.04]">
              {filteredProjects.length === 0 && (
                <div className="p-8 text-center text-sm text-white/35">
                  {text.noProjects}
                </div>
              )}

              {filteredProjects.map((project) => {
                const isSelected = selectedProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    className={`p-4 sm:p-5 transition-all hover:bg-white/[0.025] ${
                      isSelected ? 'bg-primary/[0.04]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={() => openProjectWorkspace(project)}
                        className="min-w-0 flex items-start gap-4 text-left w-full"
                      >
                        <div className={`mt-0.5 p-3 rounded-xl border shrink-0 ${
                          isSelected
                            ? 'bg-primary/10 border-primary/20 text-primary'
                            : 'bg-white/[0.03] border-white/5 text-white/25'
                        }`}>
                          <FlaskConical size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-white font-semibold leading-tight">{project.compound}</h3>
                            <span className="text-[8px] font-mono text-primary bg-primary/10 border border-primary/20 py-0.5 px-2 rounded-full uppercase tracking-widest">{project.id}</span>
                          </div>
                          <p className="text-xs text-white/35 mt-2 line-clamp-2">{project.description}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-3 text-[9px] font-mono uppercase tracking-widest text-white/25">
                            <span>{project.matrix}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-secondary/70">{project.wavelength}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span>{project.inputs.length} inputs</span>
                            <span>{project.methods.length} methods</span>
                          </div>
                        </div>
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-5 space-y-5 border-primary/10">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary font-bold">{text.createProject}</p>
              <h2 className="text-xl font-display font-bold text-white mt-2">{text.newCompound}</h2>
              <p className="text-sm text-white/45 mt-2 leading-relaxed">
                Register the compound first. Calculation methods can then be configured with readings from the equipment.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.compoundName}</span>
                <input
                  value={newProjectCompound}
                  onChange={(event) => setNewProjectCompound(event.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40 placeholder:text-white/25"
                  placeholder="Ex: Paracetamol"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.purpose}</span>
                <textarea
                  value={newProjectDescription}
                  onChange={(event) => setNewProjectDescription(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40 placeholder:text-white/25"
                  placeholder="Describe what this project should calculate..."
                />
              </label>
            </div>

            <div className="rounded-2xl bg-secondary/10 border border-secondary/20 p-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-secondary font-bold">{text.defaultMethod}</p>
              <p className="text-xs text-white/55 mt-2 leading-relaxed">
                New projects start with a rule-of-three template: C sample = A sample x C standard / A standard.
              </p>
            </div>

            <button
              onClick={createProject}
              disabled={!newProjectCompound.trim()}
              className="w-full py-4 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(167,200,255,0.25)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              {text.createProject}
            </button>
          </section>
        </div>
        )
      ) : activeTab === 'lambert-beer' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <section className="glass-panel rounded-[2rem] p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
                  <Sigma size={22} />
                </div>
                <h2 className="text-xl font-display font-bold text-white">
                  {calcMode === 'concentration' ? text.targetConcentration : text.absorbance}
                </h2>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileImport} 
                  className="hidden" 
                  accept=".csv,.txt,.log" 
                />
                <button 
                  onClick={resetCalculator}
                  title={text.resetAll}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <RotateCcw size={18} />
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  title={text.importFile}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  <FileUp size={18} />
                </button>
                <button 
                  onClick={isSerialConnected ? disconnectSerial : connectSerial}
                  title={isSerialConnected ? "Disconnect Equipment" : "Connect Serial Equipment"}
                  className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest ${
                    isSerialConnected 
                      ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                      : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white'
                  }`}
                >
                  {isSerialConnected ? <Unlink size={18} /> : <Link size={18} />}
                  {isSerialConnected ? 'Online' : 'Hardware'}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10">
                <button
                  onClick={() => {
                    void recordAnalysisStep({
                      ...getMethodAuditContext('Lambert-Beer'),
                      fieldKey: 'calculation_mode',
                      fieldLabel: 'Calculation mode',
                      previousValue: calcMode,
                      nextValue: 'concentration',
                      stepDescription: 'Selected Lambert-Beer concentration calculation mode.'
                    });
                    setCalcMode('concentration');
                  }}
                  className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest rounded-lg transition-all ${
                    calcMode === 'concentration' ? 'bg-primary text-on-primary shadow-lg' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Concentration
                </button>
                <button
                  onClick={() => {
                    void recordAnalysisStep({
                      ...getMethodAuditContext('Lambert-Beer'),
                      fieldKey: 'calculation_mode',
                      fieldLabel: 'Calculation mode',
                      previousValue: calcMode,
                      nextValue: 'absorbance',
                      stepDescription: 'Selected Lambert-Beer absorbance calculation mode.'
                    });
                    setCalcMode('absorbance');
                  }}
                  className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest rounded-lg transition-all ${
                    calcMode === 'absorbance' ? 'bg-primary text-on-primary shadow-lg' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Absorbance
                </button>
              </div>

              {calcMode === 'concentration' && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-3">{text.hardwareTarget}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setLambertSerialTarget('sample')}
                      className={`px-4 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.18em] transition-all border ${
                        lambertSerialTarget === 'sample'
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-white/[0.03] text-white/45 border-white/10 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      Sample A
                    </button>
                    <button
                      onClick={() => setLambertSerialTarget('blank')}
                      className={`px-4 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.18em] transition-all border ${
                        lambertSerialTarget === 'blank'
                          ? 'bg-secondary text-on-secondary border-secondary'
                          : 'bg-white/[0.03] text-white/45 border-white/10 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      Blank A
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="order-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {calcMode === 'concentration' ? (
                <>
                  <label className="block space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.targetWavelength}</span>
                    <div className="relative">
                      <input type="number" step="1" value={targetWavelength} onChange={(e) => setTargetWavelength(e.target.value)} onFocus={() => markAnalysisFieldStart('targetWavelength', targetWavelength)} onBlur={(event) => commitAnalysisFieldChange('targetWavelength', text.targetWavelength, event.target.value, 'Lambert-Beer', 'Updated target wavelength for Lambert-Beer analysis.')} placeholder="Ex: 400" className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
                    </div>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.absorbance}</span>
                    <input type="number" step="any" value={absSample} onChange={(e) => setAbsSample(e.target.value)} onFocus={() => markAnalysisFieldStart('absSample', absSample)} onBlur={(event) => commitAnalysisFieldChange('absSample', text.absorbance, event.target.value, 'Lambert-Beer', 'Updated Lambert-Beer sample absorbance.')} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.blank}</span>
                    <input type="number" step="any" value={absBlank} onChange={(e) => setAbsBlank(e.target.value)} onFocus={() => markAnalysisFieldStart('absBlank', absBlank)} onBlur={(event) => commitAnalysisFieldChange('absBlank', text.blank, event.target.value, 'Lambert-Beer', 'Updated Lambert-Beer blank absorbance.')} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
                  </label>
                </>
              ) : (
                <label className="block space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.targetConcentration}</span>
                  <input type="number" step="any" value={inputConcentration} onChange={(e) => setInputConcentration(e.target.value)} onFocus={() => markAnalysisFieldStart('inputConcentration', inputConcentration)} onBlur={(event) => commitAnalysisFieldChange('inputConcentration', text.targetConcentration, event.target.value, 'Lambert-Beer', 'Updated target concentration for Lambert-Beer absorbance mode.')} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
                </label>
              )}
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.molarCoeff}</span>
                <input type="number" step="any" value={epsilon} onChange={(e) => setEpsilon(e.target.value)} onFocus={() => markAnalysisFieldStart('epsilon', epsilon)} onBlur={(event) => commitAnalysisFieldChange('epsilon', text.molarCoeff, event.target.value, 'Lambert-Beer', 'Updated molar absorptivity coefficient.')} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
              </label>
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.pathLength}</span>
                <input type="number" step="any" value={pathLength} onChange={(e) => setPathLength(e.target.value)} onFocus={() => markAnalysisFieldStart('pathLength', pathLength)} onBlur={(event) => commitAnalysisFieldChange('pathLength', text.pathLength, event.target.value, 'Lambert-Beer', 'Updated optical path length.')} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
              </label>
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.dilutionFactor}</span>
                <input type="number" step="any" min="1" value={dilutionFactor} onChange={(e) => setDilutionFactor(e.target.value)} onFocus={() => markAnalysisFieldStart('dilutionFactor', dilutionFactor)} onBlur={(event) => commitAnalysisFieldChange('dilutionFactor', text.dilutionFactor, event.target.value, 'Lambert-Beer', 'Updated dilution factor.')} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
              </label>
            </div>

            {scanPoints.length > 1 && (
              <div className="order-2 rounded-2xl bg-[#08101f]/70 border border-white/8 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-secondary font-bold">Spectral Scan</p>
                    <p className="text-sm text-white/40 mt-1">
                      {scanPoints.length} readings imported
                    </p>
                  </div>
                  <span className="text-xs font-mono uppercase tracking-widest text-white/45">
                    Target: {calcMode === 'concentration' && lambertSerialTarget === 'blank' ? 'Blank A' : 'Sample A'}
                  </span>
                </div>

                {(() => {
                  const width = 720;
                  const height = 260;
                  const padding = { top: 22, right: 26, bottom: 48, left: 58 };
                  const plotWidth = width - padding.left - padding.right;
                  const plotHeight = height - padding.top - padding.bottom;
                  const minWavelength = scanPoints[0].wavelength;
                  const maxWavelength = scanPoints[scanPoints.length - 1].wavelength;
                  const absorbanceValues = scanPoints.map((point) => point.absorbance);
                  const minAbsorbance = Math.min(0, ...absorbanceValues);
                  const maxAbsorbance = Math.max(1, ...absorbanceValues);
                  const wavelengthRange = maxWavelength - minWavelength || 1;
                  const absorbanceRange = maxAbsorbance - minAbsorbance || 1;
                  const scaleX = (value: number) => padding.left + ((value - minWavelength) / wavelengthRange) * plotWidth;
                  const scaleY = (value: number) => padding.top + plotHeight - ((value - minAbsorbance) / absorbanceRange) * plotHeight;
                  const chartPoints = scanPoints.map((point) => ({
                    ...point,
                    x: scaleX(point.wavelength),
                    y: scaleY(point.absorbance)
                  }));
                  const linePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
                  const targetNumber = Number.parseFloat(targetWavelength.replace(',', '.'));
                  const selectedPoint = Number.isFinite(targetNumber)
                    ? chartPoints.reduce((closest, point) => (
                      Math.abs(point.wavelength - targetNumber) < Math.abs(closest.wavelength - targetNumber) ? point : closest
                    ), chartPoints[0])
                    : chartPoints[0];
                  const hoveredPoint = hoveredScanWavelength
                    ? chartPoints.find((point) => String(point.wavelength) === hoveredScanWavelength) ?? null
                    : null;
                  const activePoint = hoveredPoint ?? selectedPoint;
                  const getNearestPoint = (clientX: number, svgElement: SVGSVGElement) => {
                    const bounds = svgElement.getBoundingClientRect();
                    const viewBoxX = ((clientX - bounds.left) / bounds.width) * width;

                    return chartPoints.reduce((closest, point) => (
                      Math.abs(point.x - viewBoxX) < Math.abs(closest.x - viewBoxX) ? point : closest
                    ), chartPoints[0]);
                  };

                  return (
                    <div className="space-y-3">
                      <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="w-full h-[240px] sm:h-[280px] cursor-crosshair select-none"
                        role="img"
                        aria-label="Imported spectral scan"
                        onMouseMove={(event) => {
                          const point = getNearestPoint(event.clientX, event.currentTarget);
                          setHoveredScanWavelength(String(point.wavelength));
                        }}
                        onMouseLeave={() => setHoveredScanWavelength(null)}
                        onClick={(event) => {
                          const point = getNearestPoint(event.clientX, event.currentTarget);
                          applyLambertScanPoint(point);
                        }}
                      >
                        <rect x="0" y="0" width={width} height={height} rx="18" fill="rgba(255,255,255,0.015)" />
                        {[0, 0.5, 1].map((ratio) => {
                          const y = padding.top + plotHeight * ratio;
                          const value = maxAbsorbance - absorbanceRange * ratio;

                          return (
                            <g key={ratio}>
                              <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke="rgba(255,255,255,0.055)" />
                              <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="rgba(255,255,255,0.5)">
                                {formatScanInputValue(value)}
                              </text>
                            </g>
                          );
                        })}
                        {[0, 0.5, 1].map((ratio) => {
                          const x = padding.left + plotWidth * ratio;
                          const value = minWavelength + wavelengthRange * ratio;

                          return (
                            <g key={ratio}>
                              <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotHeight} stroke="rgba(255,255,255,0.035)" />
                              <text x={x} y={height - 22} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.5)">
                                {formatScanInputValue(value)}
                              </text>
                            </g>
                          );
                        })}
                        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="rgba(255,255,255,0.14)" />
                        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="rgba(255,255,255,0.14)" />
                        <polyline points={linePoints} fill="none" stroke="#76f3ea" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0 0 8px rgba(118,243,234,0.35))" />
                        <line x1={activePoint.x} y1={padding.top} x2={activePoint.x} y2={padding.top + plotHeight} stroke="rgba(167,200,255,0.45)" strokeDasharray="4 5" />
                        <circle cx={activePoint.x} cy={activePoint.y} r="8" fill="rgba(118,243,234,0.16)" />
                        <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="#76f3ea" stroke="#e9fffd" strokeWidth="1.4" filter="drop-shadow(0 0 9px rgba(118,243,234,0.8))" />
                        <text x={padding.left + plotWidth / 2} y={height - 6} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.55)">
                          Wavelength (nm)
                        </text>
                        <text x="16" y={padding.top + plotHeight / 2} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.55)" transform={`rotate(-90 16 ${padding.top + plotHeight / 2})`}>
                          Absorbance (AU)
                        </text>
                      </svg>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <button
                          type="button"
                          onClick={() => applyLambertScanPoint(activePoint)}
                          className="rounded-xl bg-primary text-on-primary px-3 py-3 font-mono uppercase tracking-[0.18em] font-bold transition-all hover:shadow-[0_0_20px_rgba(167,200,255,0.2)]"
                        >
                          Use Point
                        </button>
                        <div className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-3 font-mono text-white/70">
                          <span className="text-white/35">λ</span> {formatScanInputValue(activePoint.wavelength)} nm · <span className="text-white/35">A</span> {formatScanInputValue(activePoint.absorbance)}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="glass-panel rounded-[2rem] p-6 sm:p-8 bg-gradient-to-br from-primary/10 to-transparent border-primary/10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-secondary font-bold">Calculation Result</p>
                  <p className="text-4xl font-display font-bold text-white mt-2">
                    {formatNumber(finalResult)} <span className="text-lg text-white/40 font-mono">{calcMode === 'concentration' ? 'mol/L' : 'AU'}</span>
                  </p>
                </div>
                <div className="p-4 rounded-3xl bg-[#0b1121]/40 border border-white/10 text-secondary">
                  <Waves size={32} />
                </div>
              </div>

              <div className="space-y-4">
                {calcMode === 'concentration' && (
                <div className="p-4 rounded-2xl bg-[#08101f]/60 border border-white/5">
                  <p className="text-[10px] font-mono uppercase text-white/30 mb-2 tracking-widest">{text.effectiveAbsorbance}</p>
                  <p className="flex flex-wrap items-center gap-2 text-white font-mono">
                    <span>{sampleVal.toFixed(4)}</span>
                    <span className="text-white/45">-</span>
                    <span>{blankVal.toFixed(4)}</span>
                    <span className="text-white/45">=</span>
                    <span className="text-primary font-bold">{effectiveAbs.toFixed(4)} AU</span>
                  </p>
                </div>
                )}
                <div className="p-4 rounded-2xl bg-[#08101f]/60 border border-white/5">
                  <p className="text-[10px] font-mono uppercase text-white/30 mb-2 tracking-widest">Applied Formula</p>
                  <p className="text-sm text-white/80 leading-relaxed italic">
                    {calcMode === 'concentration' ? 'c = (A / (epsilon x l)) x DF' : 'A = epsilon x l x (c / DF)'}
                  </p>
                  {calcMode === 'concentration' ? (
                  <p className="text-xs text-white/40 mt-1">
                    c = ({effectiveAbs.toFixed(4)} / ({epsVal} x {pathVal})) x {dilVal}
                  </p>
                  ) : (
                  <p className="text-xs text-white/40 mt-1">
                    A = {epsVal} x {pathVal} x ({inputConcVal} / {dilVal})
                  </p>
                  )}
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-6 sm:p-8 border-white/[0.03] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                      Session Report
                    </p>
                    <h2 className="text-2xl font-display font-bold text-white mt-1">
                      Technical analysis report
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => {
                    printLambertReport();
                  }}
                  className="w-full py-4 bg-white/5 border border-white/10 text-white/60 text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-white/[0.08] hover:text-white transition-all rounded-xl flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Print PDF Report
                </button>
              </div>

              <div className="hidden">
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Applied Formula</p>
                  <p className="text-white mt-2 font-semibold break-words">
                    {calcMode === 'concentration' ? 'c = (A / (epsilon x l)) x DF' : 'A = epsilon x l x (c / DF)'}
                  </p>
                  <p className="text-xs text-white/45 mt-2">Target: {calcMode === 'concentration' ? 'Concentration' : 'Absorbance'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Wavelength</p>
                  <p className="text-white mt-2 font-semibold">{targetWavelength || 'N/A'} nm</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">{text.molarCoeff}</p>
                  <p className="text-white mt-2 font-semibold">{formatNumber(epsVal)} M^-1cm^-1</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">{text.pathLength}</p>
                  <p className="text-white mt-2 font-semibold">{formatNumber(pathVal)} cm</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">{text.dilutionFactor}</p>
                  <p className="text-white mt-2 font-semibold">{formatNumber(dilVal)}x</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Calculation Result</p>
                  <p className="text-white mt-2 font-semibold">
                    {formatNumber(finalResult)} {calcMode === 'concentration' ? 'mol/L' : 'AU'}
                  </p>
                </div>
              </div>

              <div className="hidden">
                <p>--- FINAL REPORT ---</p>
                <p className="mt-3">Method: Beer-Lambert Law Calculation</p>
                <p>Mode: {calcMode === 'concentration' ? 'Quantification' : 'Absorbance Estimation'}</p>
                <p className="mt-3">Analytical Parameters:</p>
                <p>  - Epsilon: {formatNumber(epsVal)}</p>
                <p>  - Path length: {formatNumber(pathVal)}</p>
                <p>  - Dilution: {formatNumber(dilVal)}</p>
                <p className="mt-3">Resulting Value: {formatNumber(finalResult)} {calcMode === 'concentration' ? 'mol/L' : 'AU'}</p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white/[0.02] border border-white/8 p-4">
                <FlaskConical size={18} className="text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-white/55 leading-relaxed">
                  This calculation assumes a linear relationship between absorbance and concentration. Ensure your 
                  readings are within the dynamic linear range of your instrument.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <>
        {returnTargetMethod && (
          <section className="glass-panel rounded-2xl p-5 border-white/[0.03] mb-5">
            <div className="flex items-start gap-4">
              <button
                onClick={returnToProjectMethod}
                className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white/45 hover:text-white hover:bg-white/[0.08] transition-all"
                title={text.backToMethod}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">{text.regressionCalculator}</p>
                <h2 className="text-2xl font-display font-bold text-white mt-2">{returnTargetMethod.name}</h2>
                <p className="text-sm text-white/45 mt-2 max-w-2xl leading-relaxed">
                  Return to the project method after building the calibration curve.
                </p>
              </div>
            </div>
          </section>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
          <section className="glass-panel rounded-[2rem] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
                  <TrendingUp size={22} />
                </div>
                <h2 className="text-xl font-display font-bold text-white">{text.calibrationCurve}</h2>
              </div>
              
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <input 
                  type="file" 
                  ref={regressionFileInputRef} 
                  onChange={handleRegressionFileImport} 
                  className="hidden" 
                  accept=".csv,.txt,.log" 
                />
                <button 
                  onClick={() => setRegressionPoints([])}
                  title={text.clearPoints}
                  aria-label={text.clearPoints}
                  className="h-11 w-11 shrink-0 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all inline-flex items-center justify-center"
                >
                  <RotateCcw size={18} />
                </button>
                <button 
                  onClick={() => regressionFileInputRef.current?.click()}
                  title={text.importPoints}
                  aria-label={text.importPoints}
                  className="h-11 w-11 shrink-0 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-white/[0.08] transition-all inline-flex items-center justify-center"
                >
                  <FileUp size={18} />
                </button>
                <button 
                  onClick={isSerialConnected ? disconnectSerial : connectSerial}
                  title={isSerialConnected ? text.disconnectEquipment : text.connectEquipment}
                  aria-label={isSerialConnected ? "Disconnect equipment" : "Connect serial equipment"}
                  className={`h-11 w-11 shrink-0 rounded-xl border transition-all inline-flex items-center justify-center ${
                    isSerialConnected 
                      ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                      : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white'
                  }`}
                >
                  {isSerialConnected ? <Unlink size={18} /> : <Link size={18} />}
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-3">{text.hardwareTarget}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRegressionSerialTarget('point')}
                  className={`px-4 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.18em] transition-all border ${
                    regressionSerialTarget === 'point'
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-white/[0.03] text-white/45 border-white/10 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  Point Y
                </button>
                <button
                  onClick={() => setRegressionSerialTarget('sample')}
                  className={`px-4 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.18em] transition-all border ${
                    regressionSerialTarget === 'sample'
                      ? 'bg-secondary text-on-secondary border-secondary'
                      : 'bg-white/[0.03] text-white/45 border-white/10 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  Sample Y
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.concentrationX}</span>
                <input type="number" step="any" value={newX} onChange={(e) => setNewX(e.target.value)} onFocus={() => markAnalysisFieldStart('newX', newX)} onBlur={(event) => commitAnalysisFieldChange('newX', text.concentrationX, event.target.value, 'Linear Regression', 'Updated pending calibration concentration.')} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" placeholder="0.00" />
              </label>
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text.absorbanceY}</span>
                <div className="flex gap-2">
                  <input type="number" step="any" value={newY} onChange={(e) => setNewY(e.target.value)} onFocus={() => markAnalysisFieldStart('newY', newY)} onBlur={(event) => commitAnalysisFieldChange('newY', text.absorbanceY, event.target.value, 'Linear Regression', 'Updated pending calibration response.')} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" placeholder="0.00" />
                  <button onClick={addPoint} className="p-3 bg-primary text-on-primary rounded-xl hover:scale-105 transition-all"><Plus size={20} /></button>
                </div>
              </label>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {regressionPoints.length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl text-white/20 text-xs font-mono uppercase tracking-widest">{text.noDataPoints}</div>
              )}
              {regressionPoints.map((point, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${
                  point.active ? 'bg-white/[0.03] border-white/5' : 'bg-red-500/5 border-red-500/10 opacity-50'
                }`}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => togglePointActive(idx)}
                      className={`transition-colors ${point.active ? 'text-primary' : 'text-white/20'}`}
                      title={point.active ? "Deactivate point" : "Activate point"}
                    >
                      {point.active ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="flex gap-6 font-mono text-sm">
                      <span className="text-white/40 w-6">P{idx + 1}</span>
                      <span className="text-white">X: {point.x}</span>
                      <span className="text-white">Y: {point.y}</span>
                    </div>
                  </div>
                  <button onClick={() => removePoint(idx)} className="text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="glass-panel rounded-[2rem] p-6 sm:p-8 bg-gradient-to-br from-primary/10 to-transparent border-primary/10">
              <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-secondary font-bold">{text.linearModel}</p>
                    <h3 className="text-white/40 text-[10px] font-mono uppercase tracking-tight">{text.leastSquares}</h3>
                  </div>
                </div>

                {(() => {
                  const results = calculateRegression();
                  const activeCount = regressionPoints.filter(p => p.active).length;
                  if (!results) return (
                    <div className="py-6 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center">
                      <p className="text-sm font-mono text-white/20 italic">
                        {activeCount < 5 ? `Min. 5 active points required (${activeCount}/5)` : 'Invalid data'}
                      </p>
                    </div>
                  );

                  const equationText = `y = ${results.slope.toFixed(4)}x ${results.intercept >= 0 ? '+' : '-'} ${Math.abs(results.intercept).toFixed(4)}`;

                  return (
                    <div className="space-y-6">
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative p-6 rounded-2xl bg-[#08101f]/80 border border-white/10 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-mono text-primary uppercase tracking-[0.2em] mb-2">{text.regressionEquation}</p>
                            <p className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                              {equationText}
                            </p>
                          </div>
                          <button 
                            onClick={() => navigator.clipboard.writeText(equationText)}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                            title="Copy Equation"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                          <p className="text-[8px] font-mono text-white/30 uppercase tracking-widest mb-1">{text.sensitivity}</p>
                          <p className="text-sm font-mono text-white font-bold">{results.slope.toFixed(6)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                          <p className="text-[8px] font-mono text-white/30 uppercase tracking-widest mb-1">{text.intercept}</p>
                          <p className="text-sm font-mono text-white font-bold">{results.intercept.toFixed(6)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                          <p className="text-[8px] font-mono text-primary/60 uppercase tracking-widest mb-1">{text.correlation}</p>
                          <p className="text-sm font-mono text-primary font-bold">{results.r2.toFixed(6)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </div>

                {/* Chart Visualization - Integrated in the middle */}
                <div className="relative w-full h-[320px] sm:h-[360px] bg-[#08101f]/60 rounded-2xl border border-white/5 p-3 sm:p-4 overflow-hidden mb-8">
                  {(() => {
                    const allValid = regressionPoints
                      .map((p, i) => ({ x: parseFloat(p.x), y: parseFloat(p.y), active: p.active, originalIndex: i }))
                      .filter(p => !isNaN(p.x) && !isNaN(p.y));

                    if (allValid.length === 0) return (
                      <div className="h-full flex flex-col items-center justify-center text-white/10 gap-3">
                        <TrendingUp size={48} className="opacity-5" />
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em]">{text.waitingPoints}</span>
                      </div>
                    );

                    const results = calculateRegression();
                    const width = 560;
                    const height = 340;
                    const chartPadding = { top: 24, right: 24, bottom: 68, left: 78 };
                    const plotLeft = chartPadding.left;
                    const plotTop = chartPadding.top;
                    const plotWidth = width - chartPadding.left - chartPadding.right;
                    const plotHeight = height - chartPadding.top - chartPadding.bottom;
                    
                    const rawMinX = Math.min(...allValid.map(p => p.x));
                    const rawMaxX = Math.max(...allValid.map(p => p.x));
                    const rawMinY = Math.min(...allValid.map(p => p.y));
                    const rawMaxY = Math.max(...allValid.map(p => p.y));
                    
                    const rangeX = (rawMaxX - rawMinX) || 1;
                    const rangeY = (rawMaxY - rawMinY) || 1;
                    const minX = rawMinX - rangeX * 0.08;
                    const maxX = rawMaxX + rangeX * 0.08;
                    const minY = rawMinY - rangeY * 0.12;
                    const maxY = rawMaxY + rangeY * 0.12;
                    const xTicks = Array.from({ length: 5 }, (_, index) => minX + ((maxX - minX) / 4) * index);
                    const yTicks = Array.from({ length: 5 }, (_, index) => minY + ((maxY - minY) / 4) * index);
                    
                    const scaleX = (val: number) => plotLeft + (val - minX) / (maxX - minX || 1) * plotWidth;
                    const scaleY = (val: number) => plotTop + plotHeight - (val - minY) / (maxY - minY || 1) * plotHeight;
                    const clipId = 'regression-chart-clip';

                    return (
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                        <defs>
                          <clipPath id={clipId}>
                            <rect x={plotLeft} y={plotTop} width={plotWidth} height={plotHeight} />
                          </clipPath>
                        </defs>

                        <rect x={plotLeft} y={plotTop} width={plotWidth} height={plotHeight} rx="8" fill="rgba(255,255,255,0.015)" />

                        {xTicks.map((tick) => {
                          const x = scaleX(tick);
                          return (
                            <g key={`x-${tick}`}>
                              <line x1={x} y1={plotTop} x2={x} y2={plotTop + plotHeight} stroke="rgba(255,255,255,0.045)" />
                              <text x={x} y={plotTop + plotHeight + 20} fill="rgba(255,255,255,0.35)" fontSize="10" textAnchor="middle">
                                {formatNumber(tick)}
                              </text>
                            </g>
                          );
                        })}

                        {yTicks.map((tick) => {
                          const y = scaleY(tick);
                          return (
                            <g key={`y-${tick}`}>
                              <line x1={plotLeft} y1={y} x2={plotLeft + plotWidth} y2={y} stroke="rgba(255,255,255,0.045)" />
                              <text x={plotLeft - 12} y={y + 4} fill="rgba(255,255,255,0.35)" fontSize="10" textAnchor="end">
                                {formatNumber(tick)}
                              </text>
                            </g>
                          );
                        })}

                        <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotTop + plotHeight} stroke="rgba(167,200,255,0.45)" strokeWidth="1.5" />
                        <line x1={plotLeft} y1={plotTop + plotHeight} x2={plotLeft + plotWidth} y2={plotTop + plotHeight} stroke="rgba(167,200,255,0.45)" strokeWidth="1.5" />
                        
                        <g clipPath={`url(#${clipId})`}>
                          {results && (
                            <line 
                              x1={scaleX(minX)} y1={scaleY(results.slope * minX + results.intercept)} 
                              x2={scaleX(maxX)} y2={scaleY(results.slope * maxX + results.intercept)} 
                              stroke="#76f3ea" strokeWidth="2.5" strokeDasharray="5 5"
                              className="opacity-70"
                            />
                          )}
                        
                          {allValid.map((p) => (
                            <circle 
                              key={p.originalIndex} 
                              cx={scaleX(p.x)} 
                              cy={scaleY(p.y)} 
                              r="5" 
                              fill={p.active ? "#a7c8ff" : "rgba(239, 68, 68, 0.2)"}
                              stroke={p.active ? "#d7e6ff" : "#ef4444"}
                              strokeWidth={p.active ? "1.5" : "1"}
                              onClick={() => togglePointActive(p.originalIndex)}
                              className={`cursor-pointer transition-all duration-300 hover:r-7 ${
                                p.active 
                                  ? 'drop-shadow-[0_0_8px_rgba(167,200,255,0.8)]' 
                                  : 'hover:fill-red-500/40'
                              }`}
                            />
                          ))}
                        </g>

                        <text x={plotLeft + plotWidth / 2} y={height - 18} fill="rgba(255,255,255,0.62)" fontSize="11" fontWeight="700" textAnchor="middle">
                          Concentration (X, mol/L)
                        </text>
                        <text
                          x="18"
                          y={plotTop + plotHeight / 2}
                          fill="rgba(255,255,255,0.62)"
                          fontSize="11"
                          fontWeight="700"
                          textAnchor="middle"
                          transform={`rotate(-90 18 ${plotTop + plotHeight / 2})`}
                        >
                          Analytical response (Y, absorbance AU)
                        </text>
                      </svg>
                    );
                  })()}
                </div>

                {/* Sample Analysis Field */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-4">{text.sampleQuantification}</p>
                  {(() => {
                    const sampleEvaluation = getRegressionSampleEvaluation();

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                          <label className="block space-y-2">
                            <span className="text-[10px] font-mono text-secondary uppercase tracking-widest">{text.sampleAbsorbance}</span>
                            <input
                              type="number"
                              step="any"
                              value={sampleY}
                              onChange={(e) => setSampleY(e.target.value)}
                              onFocus={() => markAnalysisFieldStart('sampleY', sampleY)}
                              onBlur={(event) => commitAnalysisFieldChange('sampleY', text.sampleAbsorbance, event.target.value, 'Linear Regression', 'Updated sample absorbance for curve quantification.')}
                              className={`w-full rounded-xl bg-white/[0.05] border px-4 py-3 text-white outline-none focus:border-secondary/40 ${
                                sampleEvaluation.isAboveCalibrationRange ? 'border-red-400/40' : 'border-white/10'
                              }`}
                              placeholder="0.000"
                            />
                          </label>
                          <label className="block space-y-2">
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Dilution Factor</span>
                            <input
                              type="number"
                              step="any"
                              min="1"
                              value={regressionSampleDilution}
                              onChange={(e) => setRegressionSampleDilution(e.target.value)}
                              onFocus={() => markAnalysisFieldStart('regressionSampleDilution', regressionSampleDilution)}
                              onBlur={(event) => commitAnalysisFieldChange('regressionSampleDilution', 'Dilution Factor', event.target.value, 'Linear Regression', 'Updated dilution factor for curve quantification.')}
                              className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/40"
                              placeholder="1"
                            />
                          </label>
                          <div className={`rounded-xl border p-4 ${
                            sampleEvaluation.isAboveCalibrationRange
                              ? 'bg-red-500/10 border-red-400/25'
                              : 'bg-secondary/10 border-secondary/20'
                          }`}>
                            <p className={`text-[10px] font-mono uppercase tracking-widest ${
                              sampleEvaluation.isAboveCalibrationRange ? 'text-red-200/80' : 'text-secondary/60'
                            }`}>
                              Final Conc. (X)
                            </p>
                            <p className="text-xl font-display font-bold text-white mt-1">
                              {sampleEvaluation.finalConcentration === null ? '---' : sampleEvaluation.finalConcentration.toFixed(6)}
                              <span className="text-xs font-mono text-white/40 ml-1">mol/L</span>
                            </p>
                          </div>
                        </div>

                        {sampleEvaluation.isAboveCalibrationRange && (
                          <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100 leading-relaxed">
                            Sample response is above the calibration range. Highest active curve point is {sampleEvaluation.curveMaxY !== null ? sampleEvaluation.curveMaxY.toFixed(4) : '---'} AU.
                            Dilute the sample and enter the new measured absorbance before calculating or printing the report.
                          </div>
                        )}

                        {sampleEvaluation.finalConcentration !== null && sampleEvaluation.dilution > 1 && (
                          <div className="rounded-xl border border-primary/15 bg-primary/[0.05] p-4 text-xs text-white/45 leading-relaxed">
                            Curve concentration {sampleEvaluation.dilutedConcentration?.toFixed(6)} mol/L x dilution factor {sampleEvaluation.dilution.toFixed(2)} = final concentration {sampleEvaluation.finalConcentration.toFixed(6)} mol/L.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
            </div>
            <button
              onClick={() => {
                printCalibrationReport();
              }}
              className="w-full py-4 bg-white/5 border border-white/10 text-white/60 text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-white/[0.08] hover:text-white transition-all rounded-xl flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Print Calibration Report
            </button>
          </section>
        </div>
        </>
      )}
    </div>
  );
}
