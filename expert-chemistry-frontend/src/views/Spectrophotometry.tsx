import { useDeferredValue, useEffect, useState } from 'react';
import { BookMarked, Download, FlaskConical, Search, Sparkles, Sigma, Waves } from 'lucide-react';

type SourceType = 'Bank' | 'PhotochemCAD' | 'Manual';
type TabType = 'calculate' | 'saved';

interface SavedCompoundRecord {
  id: string;
  cas: string;
  name: string;
  epsilon: number;
  lambdaMax: string;
  source: SourceType;
}

interface SpectralRecord {
  id: string;
  name: string;
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
}

interface ApiSpectralRecord {
  compound_name: string;
  absorption_wavelength_nm: number | string | null;
  molar_extinction_coefficient: number | string | null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4
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

function normalizeSource(value: string | null): SourceType {
  if (value === 'PhotochemCAD' || value === 'Manual') {
    return value;
  }

  return 'Bank';
}

export default function Spectrophotometry() {
  const [activeTab, setActiveTab] = useState<TabType>('calculate');
  const [query, setQuery] = useState('');
  const [savedQuery, setSavedQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const deferredSavedQuery = useDeferredValue(savedQuery);

  const [spectralLibrary, setSpectralLibrary] = useState<SpectralRecord[]>([]);
  const [savedCompounds, setSavedCompounds] = useState<SavedCompoundRecord[]>([]);
  const [isLoadingSpectral, setIsLoadingSpectral] = useState(true);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isSavingCompound, setIsSavingCompound] = useState(false);
  const [spectralError, setSpectralError] = useState<string | null>(null);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        const normalized = payload.spectralData.map((record) => ({
          id: `${record.compound_name}-${record.absorption_wavelength_nm ?? 'na'}`,
          name: record.compound_name,
          epsilon: Number(record.molar_extinction_coefficient ?? 0),
          lambdaMax: record.absorption_wavelength_nm ? String(record.absorption_wavelength_nm) : 'N/A',
          source: 'PhotochemCAD' as const
        }));

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
          source: normalizeSource(compound.fonte)
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
        source: normalizeSource(compound.fonte)
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
  const generatedAt = new Date().toLocaleString();

  const applySpectralRecord = (record: SpectralRecord) => {
    setCompoundName(record.name);
    setCasId('');
    setEpsilon(String(record.epsilon));
    setLambdaMax(record.lambdaMax);
    setSource(record.source);
  };

  const applySavedCompound = (compound: SavedCompoundRecord) => {
    setCompoundName(compound.name);
    setCasId(compound.cas);
    setEpsilon(String(compound.epsilon));
    setLambdaMax(compound.lambdaMax);
    setSource(compound.source);
    setActiveTab('calculate');
  };

  const resetManualEntry = () => {
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
          fonte: source
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      setSaveMessage('Compound saved to Saved Compounds.');
      await refreshSavedCompounds(savedQuery);
    } catch (_error) {
      setSaveError('Unable to save this compound right now.');
    } finally {
      setIsSavingCompound(false);
    }
  };

  const exportReportPdf = () => {
    const reportWindow = window.open('', '_blank', 'width=900,height=1200');

    if (!reportWindow) {
      window.alert('Unable to open the PDF preview window. Please allow pop-ups and try again.');
      return;
    }

    const safeCompoundName = escapeHtml(compoundName || 'Not identified');
    const safeCasId = escapeHtml(casId || 'N/A');
    const safeLambdaMax = escapeHtml(lambdaMax || 'N/A');
    const safeSource = escapeHtml(source);
    const safeGeneratedAt = escapeHtml(generatedAt);
    const safeAbsorbance = escapeHtml(formatNumber(absorbance));
    const safeEpsilon = escapeHtml(String(epsilonValue || 0));
    const safePathLength = escapeHtml(String(pathLengthValue || 0));
    const safeConcentration = escapeHtml(String(concentrationValue || 0));

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

  return (
    <div className="space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">
              Beer-Lambert Workflow
            </span>
          </div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">
            Spectrophotometry Console
          </h1>
          <p className="text-white/40 mt-1 max-w-3xl text-sm leading-relaxed">
            Calculation input now comes from <span className="text-white/80">spectral_data</span>, while
            saved compound results live in <span className="text-white/80">compounds</span>.
          </p>
        </div>

        <div className="glass-panel px-5 py-4 rounded-2xl border-white/[0.03] max-w-md">
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
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
          <section className="glass-panel rounded-[2rem] p-8 border-white/[0.03] space-y-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                  Spectral Lookup
                </p>
                <h2 className="text-2xl font-display font-bold text-white mt-2">
                  Pull inputs from spectral_data
                </h2>
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
                placeholder="Search spectral_data by compound name..."
                className="w-full rounded-2xl bg-white/[0.03] border border-white/10 pl-12 pr-4 py-4 text-sm text-white outline-none transition-all focus:border-primary/30 focus:bg-white/[0.06]"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[320px] overflow-auto custom-scrollbar pr-2">
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
                  className="text-left rounded-2xl p-5 bg-white/[0.03] border border-white/8 hover:border-primary/25 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold group-hover:text-primary transition-colors break-words leading-relaxed">
                      {record.name}
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                      Spectral source
                    </p>
                    </div>
                    <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[9px] font-mono uppercase tracking-[0.18em] text-secondary font-bold">
                      {record.source}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">Compound Name</span>
                <input
                  value={compoundName}
                  onChange={(event) => setCompoundName(event.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">CAS</span>
                <input
                  value={casId}
                  onChange={(event) => setCasId(event.target.value)}
                  placeholder="Optional manual CAS"
                  className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">Molar Extinction Coefficient</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={epsilon}
                  onChange={(event) => setEpsilon(event.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">Lambda Max (nm)</span>
                <input
                  value={lambdaMax}
                  onChange={(event) => setLambdaMax(event.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                />
              </label>
            </div>
          </section>

          <section className="space-y-6">
            <div className="glass-panel rounded-[2rem] p-8 border-white/[0.03]">
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
                <div className="flex items-center justify-between gap-4">
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
                  <div className="p-5 rounded-3xl bg-[#0b1121]/40 border border-white/10 text-secondary">
                    <Waves size={34} />
                  </div>
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

            <div className="glass-panel rounded-[2rem] p-8 border-white/[0.03] space-y-5">
              <div className="flex items-start justify-between gap-4">
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
                  onClick={exportReportPdf}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-primary text-on-primary text-[10px] font-mono uppercase tracking-[0.25em] font-bold hover:shadow-[0_0_30px_rgba(167,200,255,0.28)] transition-all"
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
        <section className="glass-panel rounded-[2rem] p-8 border-white/[0.03] space-y-8">
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
                className="rounded-[1.6rem] p-6 bg-white/[0.03] border border-white/8 hover:border-primary/20 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white text-lg font-semibold">{compound.name}</p>
                    <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                      CAS {compound.cas}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[9px] font-mono uppercase tracking-[0.18em] text-secondary font-bold">
                      {compound.source}
                    </span>
                    <button
                      onClick={() => applySavedCompound(compound)}
                      className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-on-primary transition-all"
                      title="Load into calculator"
                    >
                      <BookMarked size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">epsilon</p>
                    <p className="text-white mt-2 font-semibold">{formatNumber(compound.epsilon)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">lambda max</p>
                    <p className="text-white mt-2 font-semibold">{compound.lambdaMax} nm</p>
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
