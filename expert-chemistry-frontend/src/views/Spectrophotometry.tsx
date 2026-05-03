import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FlaskConical, Search, Sparkles, Sigma, Trash2, Waves } from 'lucide-react';

type SourceType = 'Bank' | 'PhotochemCAD' | 'Manual';
type TabType = 'calculate' | 'saved';

interface SavedCompoundRecord {
  id: string;
  cas: string;
  name: string;
  epsilon: number;
  lambdaMax: string;
  source: SourceType;
  pathLength: number;
  concentration: number;
  absorbance: number;
  savedAt: string;
}

interface SpectralRecord {
  id: string;
  name: string;
  cas: string;
  epsilon: number;
  lambdaMax: string;
  source: SourceType;
}

interface ApiCompoundRecord {
  cas: string;
  nome: string;
  epsilon_m_cm: number | string | null;
  lambda_max: string | null;
  fonte: string | null;
  path_length_cm?: number | string | null;
  concentration_mol_l?: number | string | null;
  absorbance?: number | string | null;
  saved_at?: string | null;
}

interface ApiSpectralRecord {
  compound_name: string;
  cas?: string | null;
  absorption_wavelength_nm: number | string | null;
  molar_extinction_coefficient: number | string | null;
}

interface ReportPayload {
  compoundName: string;
  casId: string;
  lambdaMax: string;
  source: SourceType;
  epsilonValue: number;
  pathLengthValue: number;
  concentrationValue: number;
  absorbance: number;
  generatedAt: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 4
  }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeSource(value: string | null): SourceType {
  if (value === 'PhotochemCAD' || value === 'Manual') {
    return value;
  }

  return 'Bank';
}

function getSpectralSortKey(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();

  return normalized || value.toLowerCase();
}

function getSpectralSortPriority(value: string) {
  const normalized = getSpectralSortKey(value);

  if (!normalized) {
    return 2;
  }

  const firstCharacter = normalized[0];

  if (/[a-z]/.test(firstCharacter)) {
    return 0;
  }

  if (/[0-9]/.test(firstCharacter)) {
    return 1;
  }

  return 2;
}

export default function Spectrophotometry() {
  const [activeTab, setActiveTab] = useState<TabType>('calculate');
  const [query, setQuery] = useState('');
  const [savedQuery, setSavedQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const deferredSavedQuery = useDeferredValue(savedQuery);

  const [spectralLibrary, setSpectralLibrary] = useState<SpectralRecord[]>([]);
  const [savedCompounds, setSavedCompounds] = useState<SavedCompoundRecord[]>([]);
  const [selectedSpectralRecordId, setSelectedSpectralRecordId] = useState<string | null>(null);
  const [isLoadingSpectral, setIsLoadingSpectral] = useState(true);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isSavingCompound, setIsSavingCompound] = useState(false);
  const [spectralError, setSpectralError] = useState<string | null>(null);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingDeleteCas, setPendingDeleteCas] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedCompoundRecord | null>(null);
  const reportSectionRef = useRef<HTMLDivElement | null>(null);

  const [compoundName, setCompoundName] = useState('');
  const [casId, setCasId] = useState('');
  const [epsilon, setEpsilon] = useState('0');
  const [lambdaMax, setLambdaMax] = useState('N/A');
  const [source, setSource] = useState<SourceType>('Manual');
  const [pathLength, setPathLength] = useState('1');
  const [concentration, setConcentration] = useState('0');

  useEffect(() => {
    const controller = new AbortController();

    async function loadSpectralData() {
      setIsLoadingSpectral(true);
      setSpectralError(null);

      try {
        const params = new URLSearchParams();
        if (deferredQuery.trim()) {
          params.set('search', deferredQuery.trim());
        }

        const url = params.size > 0 ? `/api/spectral-data?${params.toString()}` : '/api/spectral-data';
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { spectralData: ApiSpectralRecord[] };
        const normalized = payload.spectralData
          .map((record) => ({
            id: `${record.compound_name}-${record.absorption_wavelength_nm ?? 'na'}`,
            name: record.compound_name,
            cas: record.cas || '',
            epsilon: Number(record.molar_extinction_coefficient ?? 0),
            lambdaMax: record.absorption_wavelength_nm ? String(record.absorption_wavelength_nm) : 'N/A',
            source: 'PhotochemCAD' as const
          }))
          .sort((left, right) => {
            const priorityDifference = getSpectralSortPriority(left.name) - getSpectralSortPriority(right.name);

            if (priorityDifference !== 0) {
              return priorityDifference;
            }

            return getSpectralSortKey(left.name).localeCompare(getSpectralSortKey(right.name));
          });

        setSpectralLibrary(normalized);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSpectralError('Unable to load spectral data right now.');
      } finally {
        setIsLoadingSpectral(false);
      }
    }

    loadSpectralData();

    return () => controller.abort();
  }, [deferredQuery]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSavedCompounds() {
      setIsLoadingSaved(true);
      setSavedError(null);

      try {
        const params = new URLSearchParams();
        if (deferredSavedQuery.trim()) {
          params.set('search', deferredSavedQuery.trim());
        }

        const url = params.size > 0 ? `/api/compounds?${params.toString()}` : '/api/compounds';
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { compounds: ApiCompoundRecord[] };
        const normalized = payload.compounds.map((compound) => ({
          id: compound.cas,
          cas: compound.cas,
          name: compound.nome,
          epsilon: Number(compound.epsilon_m_cm ?? 0),
          lambdaMax: compound.lambda_max || 'N/A',
          source: normalizeSource(compound.fonte),
          pathLength: Number(compound.path_length_cm ?? 0),
          concentration: Number(compound.concentration_mol_l ?? 0),
          absorbance: Number(compound.absorbance ?? 0),
          savedAt: compound.saved_at || ''
        }));

        setSavedCompounds(normalized);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSavedError('Unable to load saved compounds right now.');
      } finally {
        setIsLoadingSaved(false);
      }
    }

    loadSavedCompounds();

    return () => controller.abort();
  }, [deferredSavedQuery]);

  async function refreshSavedCompounds(searchValue = deferredSavedQuery) {
    setIsLoadingSaved(true);
    setSavedError(null);

    try {
      const params = new URLSearchParams();
      if (searchValue.trim()) {
        params.set('search', searchValue.trim());
      }

      const url = params.size > 0 ? `/api/compounds?${params.toString()}` : '/api/compounds';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { compounds: ApiCompoundRecord[] };
      const normalized = payload.compounds.map((compound) => ({
        id: compound.cas,
        cas: compound.cas,
        name: compound.nome,
        epsilon: Number(compound.epsilon_m_cm ?? 0),
        lambdaMax: compound.lambda_max || 'N/A',
        source: normalizeSource(compound.fonte),
        pathLength: Number(compound.path_length_cm ?? 0),
        concentration: Number(compound.concentration_mol_l ?? 0),
        absorbance: Number(compound.absorbance ?? 0),
        savedAt: compound.saved_at || ''
      }));

      setSavedCompounds(normalized);
    } catch (_error) {
      setSavedError('Unable to load saved compounds right now.');
    } finally {
      setIsLoadingSaved(false);
    }
  }

  const epsilonValue = Number.parseFloat(epsilon) || 0;
  const pathLengthValue = Number.parseFloat(pathLength) || 0;
  const concentrationValue = Number.parseFloat(concentration) || 0;
  const absorbance = epsilonValue * pathLengthValue * concentrationValue;
  const generatedAt = new Date().toLocaleString('pt-BR');
  const hasSelectedCompound = compoundName.trim().length > 0;
  const hasCalculationInputs = pathLengthValue > 0 && concentrationValue > 0;
  const formulaPreview = `${formatNumber(epsilonValue)} x ${formatNumber(pathLengthValue)} x ${formatNumber(concentrationValue)}`;

  const applySpectralRecord = (record: SpectralRecord) => {
    setSelectedSpectralRecordId(record.id);
    setCompoundName(record.name);
    setCasId(record.cas);
    setEpsilon(String(record.epsilon));
    setLambdaMax(record.lambdaMax);
    setSource(record.source);
  };

  const applySavedCompound = (compound: SavedCompoundRecord) => {
    setSelectedSpectralRecordId(null);
    setCompoundName(compound.name);
    setCasId(compound.cas);
    setEpsilon(String(compound.epsilon));
    setLambdaMax(compound.lambdaMax);
    setSource(compound.source);
    setPathLength(String(compound.pathLength || 0));
    setConcentration(String(compound.concentration || 0));
    setActiveTab('calculate');
  };

  const buildReportPayload = (overrides?: Partial<ReportPayload>): ReportPayload => ({
    compoundName: compoundName || 'Not identified',
    casId: casId || 'N/A',
    lambdaMax: lambdaMax || 'N/A',
    source,
    epsilonValue,
    pathLengthValue,
    concentrationValue,
    absorbance,
    generatedAt,
    ...overrides
  });

  const resetManualEntry = () => {
    setSelectedSpectralRecordId(null);
    setCompoundName('');
    setCasId('');
    setEpsilon('0');
    setLambdaMax('N/A');
    setSource('Manual');
    setSaveMessage(null);
    setSaveError(null);
  };

  const saveCompound = async () => {
    setSaveMessage(null);
    setSaveError(null);

    if (!compoundName.trim()) {
      setSaveError('Enter or select a compound before saving.');
      return;
    }

    setIsSavingCompound(true);

    try {
      const response = await fetch('/api/compounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cas: casId.trim() || 'S/CAS',
          nome: compoundName.trim(),
          epsilon_m_cm: epsilonValue,
          lambda_max: lambdaMax.trim() || 'N/A',
          fonte: source,
          path_length_cm: pathLengthValue,
          concentration_mol_l: concentrationValue,
          absorbance
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      setSaveMessage('Compound saved to Saved Compounds.');
      await refreshSavedCompounds(savedQuery);
      reportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_error) {
      setSaveError('Unable to save this compound right now.');
    } finally {
      setIsSavingCompound(false);
    }
  };

  const exportReportPdf = (payload = buildReportPayload()) => {
    const reportWindow = window.open('', '_blank', 'width=900,height=1200');

    if (!reportWindow) {
      window.alert('Unable to open the PDF preview window. Please allow pop-ups and try again.');
      return;
    }

    const safeCompoundName = escapeHtml(payload.compoundName);
    const safeCasId = escapeHtml(payload.casId);
    const safeLambdaMax = escapeHtml(payload.lambdaMax);
    const safeSource = escapeHtml(payload.source);
    const safeGeneratedAt = escapeHtml(payload.generatedAt);
    const safeAbsorbance = escapeHtml(formatNumber(payload.absorbance));
    const safeEpsilon = escapeHtml(String(payload.epsilonValue || 0));
    const safePathLength = escapeHtml(String(payload.pathLengthValue || 0));
    const safeConcentration = escapeHtml(String(payload.concentrationValue || 0));

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Spectrophotometry Report</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              background: #eef3fb;
              color: #0f172a;
            }
            .page {
              max-width: 820px;
              margin: 32px auto;
              background: #ffffff;
              border-radius: 24px;
              padding: 40px;
              box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
            }
            .hero {
              background: linear-gradient(135deg, #dbeafe, #ecfeff);
              border: 1px solid #cbd5e1;
              border-radius: 20px;
              padding: 24px;
            }
            .eyebrow {
              font-size: 11px;
              letter-spacing: 0.28em;
              text-transform: uppercase;
              color: #0f766e;
              font-weight: 700;
            }
            h1 {
              margin: 12px 0 8px;
              font-size: 32px;
              line-height: 1.1;
            }
            .subtitle {
              margin: 0;
              color: #475569;
              font-size: 14px;
              line-height: 1.6;
            }
            .meta {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px;
              margin-top: 28px;
            }
            .card {
              border: 1px solid #dbe2ea;
              border-radius: 16px;
              padding: 16px;
              background: #f8fafc;
            }
            .label {
              margin: 0 0 8px;
              font-size: 11px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: #64748b;
              font-weight: 700;
            }
            .value {
              margin: 0;
              font-size: 16px;
              font-weight: 700;
              color: #0f172a;
            }
            .result {
              margin-top: 28px;
              border-radius: 20px;
              padding: 24px;
              background: linear-gradient(135deg, #0f172a, #1e293b);
              color: #ffffff;
            }
            .result .label { color: #93c5fd; }
            .result-value {
              margin: 10px 0 0;
              font-size: 40px;
              font-weight: 800;
            }
            .report {
              margin-top: 28px;
              border: 1px solid #dbe2ea;
              border-radius: 20px;
              padding: 24px;
              background: #ffffff;
            }
            .report pre {
              margin: 0;
              white-space: pre-wrap;
              font-family: "Courier New", Courier, monospace;
              font-size: 14px;
              line-height: 1.7;
              color: #1e293b;
            }
            .footer {
              margin-top: 28px;
              font-size: 12px;
              color: #64748b;
              text-align: right;
            }
            @media print {
              body { background: #ffffff; }
              .page {
                margin: 0;
                max-width: none;
                border-radius: 0;
                box-shadow: none;
                padding: 24px;
              }
            }
          </style>
        </head>
        <body>
          <main class="page">
            <section class="hero">
              <p class="eyebrow">Beer-Lambert Workflow</p>
              <h1>Spectrophotometry Report</h1>
              <p class="subtitle">Analytical output prepared from the session report panel in Expert Chemistry.</p>
            </section>

            <section class="meta">
              <article class="card"><p class="label">Compound</p><p class="value">${safeCompoundName}</p></article>
              <article class="card"><p class="label">Source</p><p class="value">${safeSource}</p></article>
              <article class="card"><p class="label">CAS</p><p class="value">${safeCasId}</p></article>
              <article class="card"><p class="label">Lambda Max</p><p class="value">${safeLambdaMax} nm</p></article>
              <article class="card"><p class="label">Epsilon</p><p class="value">${safeEpsilon} M^-1 cm^-1</p></article>
              <article class="card"><p class="label">Generated At</p><p class="value">${safeGeneratedAt}</p></article>
              <article class="card"><p class="label">Path Length</p><p class="value">${safePathLength} cm</p></article>
              <article class="card"><p class="label">Concentration</p><p class="value">${safeConcentration} mol/L</p></article>
            </section>

            <section class="result">
              <p class="label">Absorbance Result</p>
              <p class="result-value">${safeAbsorbance}</p>
            </section>

            <section class="report">
              <pre>--- FINAL REPORT ---
Compound: ${safeCompoundName}
Epsilon: ${safeEpsilon} M^-1 cm^-1
Lambda max: ${safeLambdaMax} nm
Source: ${safeSource}
Path length: ${safePathLength} cm
Concentration: ${safeConcentration} mol/L
Absorbance: ${safeAbsorbance}</pre>
            </section>

            <p class="footer">Exported from Expert Chemistry</p>
          </main>
        </body>
      </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const exportSavedCompoundReport = (compound: SavedCompoundRecord) => {
    applySavedCompound(compound);

    exportReportPdf(
      buildReportPayload({
        compoundName: compound.name,
        casId: compound.cas || 'N/A',
        lambdaMax: compound.lambdaMax || 'N/A',
        source: compound.source,
        epsilonValue: compound.epsilon,
        pathLengthValue: compound.pathLength,
        concentrationValue: compound.concentration,
        absorbance: compound.absorbance
      })
    );
  };

  const requestDeleteSavedCompound = (compound: SavedCompoundRecord) => {
    setDeleteTarget(compound);
  };

  const confirmDeleteSavedCompound = async () => {
    if (!deleteTarget) {
      return;
    }

    setPendingDeleteCas(deleteTarget.cas);
    setSavedError(null);

    try {
      const response = await fetch(`/api/compounds/${encodeURIComponent(deleteTarget.cas)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      await refreshSavedCompounds(savedQuery);
      setDeleteTarget(null);
    } catch (_error) {
      setSavedError('Unable to delete this saved compound right now.');
    } finally {
      setPendingDeleteCas(null);
    }
  };

  const deleteModal = deleteTarget ? (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close delete confirmation"
        onClick={() => setDeleteTarget(null)}
        className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-[2rem] border border-red-400/20 bg-[#0b1121] p-6 sm:p-7 shadow-[0_24px_80px_rgba(2,6,23,0.65)]">
        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-red-200 font-bold">
          Delete Saved Compound
        </p>
        <h3 className="text-2xl font-display font-bold text-white mt-4">
          Remove this record from the saved library?
        </h3>
        <p className="text-sm text-white/60 leading-relaxed mt-4">
          This will permanently delete <span className="text-white font-semibold">{deleteTarget.name}</span> with CAS{' '}
          <span className="text-white font-semibold">{deleteTarget.cas}</span> from the saved compounds list.
        </p>
        <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm">
          <p className="text-white/30 font-mono uppercase tracking-widest">Saved record</p>
          <p className="text-white font-semibold mt-2">{deleteTarget.name}</p>
          <p className="text-white/55 mt-2">Absorbance {formatNumber(deleteTarget.absorbance)}</p>
        </div>
        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/75 hover:bg-white/[0.07] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDeleteSavedCompound}
            disabled={pendingDeleteCas === deleteTarget.cas}
            className="flex-1 rounded-xl border border-red-400/20 bg-red-500/90 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pendingDeleteCas === deleteTarget.cas ? 'Deleting...' : 'Delete Record'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-8 sm:space-y-10">
      {deleteModal && createPortal(deleteModal, document.body)}

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">
              Beer-Lambert Workflow
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            Spectrophotometry Console
          </h1>
          <p className="text-white/40 mt-1 max-w-3xl text-sm leading-relaxed">
            Calculation input now comes from <span className="text-white/80">spectral_data</span>, while
            saved compound results live in <span className="text-white/80">compounds</span>.
          </p>
        </div>

        <div className="glass-panel px-5 py-4 rounded-2xl border-white/[0.03] w-full xl:max-w-md">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">
            Data Flow
          </p>
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            Use the calculation tab to pull epsilon and lambda max from spectral measurements, then switch to
            saved compounds when you want to review entries that are already stored.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setActiveTab('calculate')}
          className={`px-5 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
            activeTab === 'calculate'
              ? 'bg-primary text-on-primary border-primary shadow-[0_0_30px_rgba(167,200,255,0.2)]'
              : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.08]'
          }`}
        >
          Calculate
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-5 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
            activeTab === 'saved'
              ? 'bg-primary text-on-primary border-primary shadow-[0_0_30px_rgba(167,200,255,0.2)]'
              : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.08]'
          }`}
        >
          Saved Compounds
        </button>
      </div>

      {activeTab === 'calculate' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8">
          <section className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03] space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={`rounded-2xl border p-4 ${hasSelectedCompound ? 'border-primary/30 bg-primary/10' : 'border-white/8 bg-white/[0.03]'}`}>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] font-bold text-white/35">Step 1</p>
                <p className="text-white font-semibold mt-2">Select a compound</p>
                <p className="text-sm text-white/50 mt-2">
                  {hasSelectedCompound ? compoundName : 'Choose a record from the spectral library.'}
                </p>
              </div>
              <div className={`rounded-2xl border p-4 ${hasCalculationInputs ? 'border-secondary/30 bg-secondary/10' : 'border-white/8 bg-white/[0.03]'}`}>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] font-bold text-white/35">Step 2</p>
                <p className="text-white font-semibold mt-2">Enter experiment values</p>
                <p className="text-sm text-white/50 mt-2">
                  Provide path length and concentration to complete the equation.
                </p>
              </div>
              <div className={`rounded-2xl border p-4 ${hasSelectedCompound ? 'border-white/12 bg-white/[0.04]' : 'border-white/8 bg-white/[0.03]'}`}>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] font-bold text-white/35">Step 3</p>
                <p className="text-white font-semibold mt-2">Review absorbance</p>
                <p className="text-sm text-white/50 mt-2">
                  Save the result or export the session report when it looks right.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                  Spectral Lookup
                </p>
                <h2 className="text-2xl font-display font-bold text-white mt-2">
                  Pull inputs from spectral_data
                </h2>
                <p className="text-sm text-white/45 mt-2">
                  The library is ordered from <span className="text-white/80">A to Z</span> so you can scan
                  compounds more quickly.
                </p>
              </div>
              <button
                onClick={resetManualEntry}
                className="px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all text-[10px] font-mono uppercase tracking-[0.25em] text-white/70"
              >
                Clear Entry
              </button>
            </div>

            <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-primary transition-colors" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search spectral_data by compound name or CAS..."
                className="w-full rounded-2xl bg-white/[0.03] border border-white/10 pl-12 pr-4 py-4 text-sm text-white outline-none transition-all focus:border-primary/30 focus:bg-white/[0.06]"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/8 bg-[#08101f]/55 px-4 py-3">
              <p className="text-sm text-white/65">
                {isLoadingSpectral ? 'Refreshing spectral library...' : `${spectralLibrary.length} compounds available in the current view`}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/30">
                Search supports compound names and CAS values
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[950px] overflow-auto custom-scrollbar pr-0 sm:pr-2">
              {isLoadingSpectral && (
                <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
                  Loading spectral data...
                </div>
              )}

              {!isLoadingSpectral && spectralError && (
                <div className="lg:col-span-2 rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-100">
                  {spectralError}
                </div>
              )}

              {!isLoadingSpectral && !spectralError && spectralLibrary.length === 0 && (
                <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
                  No spectral records found for this search.
                </div>
              )}

              {!isLoadingSpectral && !spectralError && spectralLibrary.map((record) => (
                <button
                  key={record.id}
                  onClick={() => applySpectralRecord(record)}
                  className={`text-left rounded-2xl p-5 border transition-all group ${
                    selectedSpectralRecordId === record.id
                      ? 'bg-primary/12 border-primary/40 shadow-[0_0_40px_rgba(167,200,255,0.18)]'
                      : 'bg-white/[0.03] border-white/8 hover:border-primary/25 hover:bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-semibold break-words leading-relaxed transition-colors ${
                          selectedSpectralRecordId === record.id ? 'text-primary' : 'text-white group-hover:text-primary'
                        }`}
                      >
                        {record.name}
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                        Spectral source
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full border text-[9px] font-mono uppercase tracking-[0.18em] font-bold ${
                        selectedSpectralRecordId === record.id
                          ? 'border-primary/25 bg-primary/15 text-primary'
                          : 'border-white/10 bg-white/[0.03] text-secondary'
                      }`}
                    >
                      {record.source}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-3 min-w-0">
                      <p className="text-white/30 font-mono uppercase tracking-widest">epsilon</p>
                      <p className="text-white mt-1 font-semibold">{formatNumber(record.epsilon)}</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-3 min-w-0">
                      <p className="text-white/30 font-mono uppercase tracking-widest">lambda max</p>
                      <p className="text-white mt-1 font-semibold">{record.lambdaMax} nm</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

          </section>

          <section className="space-y-6">
            <div className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <Sigma size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                    Analytical Input
                  </p>
                  <h2 className="text-2xl font-display font-bold text-white mt-1">
                    Calculate absorbance
                  </h2>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-primary/20 bg-primary/8 px-4 py-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary font-bold">
                    Current Compound
                  </p>
                  <p className="text-xl font-display font-bold text-white mt-2">
                    {compoundName || 'Select a compound from the spectral library'}
                  </p>
                  <p className="text-sm text-white/50 mt-2">
                    CAS {casId || 'N/A'} - Lambda Max {lambdaMax || 'N/A'} nm
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                    <div className="rounded-xl bg-[#08101f]/65 border border-white/8 p-3">
                      <p className="text-white/30 font-mono uppercase tracking-widest">epsilon</p>
                      <p className="text-white mt-2 font-semibold">{formatNumber(epsilonValue)} M^-1 cm^-1</p>
                    </div>
                    <div className="rounded-xl bg-[#08101f]/65 border border-white/8 p-3">
                      <p className="text-white/30 font-mono uppercase tracking-widest">source</p>
                      <p className="text-white mt-2 font-semibold">{source}</p>
                    </div>
                  </div>
                </div>

                <label className="space-y-2 block">
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">Optical Path Length (cm)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={pathLength}
                    onChange={(event) => setPathLength(event.target.value)}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                  />
                </label>
                <label className="space-y-2 block">
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">Concentration (mol/L)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={concentration}
                    onChange={(event) => setConcentration(event.target.value)}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                  />
                </label>
              </div>

              <div className="mt-8 rounded-[1.5rem] p-6 bg-gradient-to-br from-primary/12 via-white/[0.02] to-secondary/10 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">
                      Result
                    </p>
                    <p className="text-4xl font-display font-bold text-white mt-2">
                      {formatNumber(absorbance)}
                    </p>
                    <p className="text-sm text-white/45 mt-2">
                      Calculated with <span className="text-white/80">A = epsilon x l x c</span>
                    </p>
                  </div>
                  <div className="p-4 sm:p-5 rounded-3xl bg-[#0b1121]/40 border border-white/10 text-secondary self-start sm:self-auto">
                    <Waves size={34} />
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-[#08101f]/60 border border-white/8 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30">Live Formula Preview</p>
                  <p className="text-white font-semibold mt-3 break-words">A = {formulaPreview}</p>
                  <p className="text-sm text-white/55 mt-2">A = {formatNumber(absorbance)}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  onClick={saveCompound}
                  disabled={isSavingCompound}
                  className="px-6 py-3 rounded-xl bg-secondary text-on-secondary text-[10px] font-mono uppercase tracking-[0.25em] font-bold hover:shadow-[0_0_30px_rgba(118,243,234,0.22)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingCompound ? 'Saving...' : 'Save To Saved Compounds'}
                </button>
                {saveMessage && <p className="text-sm text-secondary">{saveMessage}</p>}
                {saveError && <p className="text-sm text-red-300">{saveError}</p>}
              </div>
            </div>

            <div ref={reportSectionRef} className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03] space-y-5">
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
                      Script-style output
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => exportReportPdf()}
                  className="inline-flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-primary text-on-primary text-[10px] font-mono uppercase tracking-[0.25em] font-bold hover:shadow-[0_0_30px_rgba(167,200,255,0.28)] transition-all w-full sm:w-auto"
                >
                  <Download size={16} />
                  Export PDF
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Compound</p>
                  <p className="text-white mt-2 font-semibold">{compoundName || 'Not identified'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Source</p>
                  <p className="text-white mt-2 font-semibold">{source}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">CAS</p>
                  <p className="text-white mt-2 font-semibold">{casId || 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Lambda Max</p>
                  <p className="text-white mt-2 font-semibold">{lambdaMax || 'N/A'}</p>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-[#08101f] border border-white/8 p-5 font-mono text-sm text-white/80">
                <p>--- FINAL REPORT ---</p>
                <p className="mt-3">Compound: {compoundName || 'Not identified'}</p>
                <p>Epsilon: {epsilonValue || 0} M^-1 cm^-1</p>
                <p>Lambda max: {lambdaMax || 'N/A'} nm</p>
                <p>Source: {source}</p>
                <p>Absorbance: {formatNumber(absorbance)}</p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white/[0.02] border border-white/8 p-4">
                <FlaskConical size={18} className="text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-white/55 leading-relaxed">
                  The calculator now uses spectral records as the source for epsilon and lambda max, which keeps
                  the saved compounds list separate from the raw analytical input data.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03] space-y-8">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                Saved Results
              </p>
              <h2 className="text-2xl font-display font-bold text-white mt-2">
                Compounds already stored in the database
              </h2>
              <p className="text-sm text-white/50 mt-2 max-w-2xl leading-relaxed">
                This tab is for reviewing compounds that already have stored calculation data in the
                <span className="text-white/75"> compounds </span>
                table.
              </p>
            </div>
            <div className="relative group w-full xl:w-[420px]">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-primary transition-colors" />
              <input
                value={savedQuery}
                onChange={(event) => setSavedQuery(event.target.value)}
                placeholder="Search saved compounds by CAS or name..."
                className="w-full rounded-2xl bg-white/[0.03] border border-white/10 pl-12 pr-4 py-4 text-sm text-white outline-none transition-all focus:border-primary/30 focus:bg-white/[0.06]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {isLoadingSaved && (
              <div className="xl:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
                Loading saved compounds...
              </div>
            )}

            {!isLoadingSaved && savedError && (
              <div className="xl:col-span-2 rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-100">
                {savedError}
              </div>
            )}

            {!isLoadingSaved && !savedError && savedCompounds.length === 0 && (
              <div className="xl:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
                No saved compounds found.
              </div>
            )}

            {!isLoadingSaved && !savedError && savedCompounds.map((compound) => (
              <div
                key={compound.id}
                className="rounded-[1.6rem] p-5 sm:p-6 bg-white/[0.03] border border-white/8 hover:border-primary/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <p className="text-white text-lg font-semibold">{compound.name}</p>
                    <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                      CAS {compound.cas}
                    </p>
                    <p className="text-xs text-white/45 mt-2">
                      Saved {compound.savedAt ? formatDateTime(compound.savedAt) : 'recently'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[9px] font-mono uppercase tracking-[0.18em] text-secondary font-bold">
                      {compound.source}
                    </span>
                    <button
                      onClick={() => requestDeleteSavedCompound(compound)}
                      disabled={pendingDeleteCas === compound.cas}
                      className="p-2.5 rounded-xl bg-red-500/10 text-red-200 border border-red-400/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Delete saved compound"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => exportSavedCompoundReport(compound)}
                      className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-on-primary transition-all"
                      title="Generate report PDF"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">epsilon</p>
                    <p className="text-white mt-2 font-semibold">{formatNumber(compound.epsilon)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">lambda max</p>
                    <p className="text-white mt-2 font-semibold">{compound.lambdaMax} nm</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">path length</p>
                    <p className="text-white mt-2 font-semibold">{formatNumber(compound.pathLength)} cm</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">concentration</p>
                    <p className="text-white mt-2 font-semibold">{formatNumber(compound.concentration)} mol/L</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4 sm:col-span-2">
                    <p className="text-white/30 font-mono uppercase tracking-widest">absorbance</p>
                    <p className="text-white mt-2 font-semibold">{formatNumber(compound.absorbance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
