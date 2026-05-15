import { useState, useRef, useEffect } from 'react';
import { FileCode, Play, Edit2, Copy, Shield, Sigma, Waves, Calculator, Cpu, Link, Unlink, FileUp, RotateCcw, TrendingUp, Plus, Trash2, CheckCircle2, Circle, Download, Sparkles, FlaskConical } from 'lucide-react';
import type { AuthUser } from '../types/auth';
import { buildReportPayload, openPrintableReport } from '../utils/reportExport';

const methods = [
  { id: 'MTD-01', name: 'Alkaloid Extraction V2', author: 'Dr. Aris Thorne', lastAccess: 'Yesterday', version: '2.4.1', status: 'Approved' },
  { id: 'MTD-02', name: 'Trace Metal Quantification', author: 'Elena Rossi', lastAccess: '3 days ago', version: '1.0.8', status: 'Draft' },
  { id: 'MTD-03', name: 'Organoleptic Testing Suite', author: 'AI Core', lastAccess: '1 week ago', version: '4.2.0', status: 'Automated' },
  { id: 'MTD-04', name: 'Rapid Pesticide Screening', author: 'Kevin Wu', lastAccess: '2 weeks ago', version: '3.1.2', status: 'Approved' },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 2
  }).format(value);
}

interface MethodsProps {
  currentUser: AuthUser;
}

export default function Methods({ currentUser }: MethodsProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'lambert-beer' | 'linear-regression'>('library');
  
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
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const portRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const regressionFileInputRef = useRef<HTMLInputElement>(null);

  // States para Regressão Linear
  const [regressionPoints, setRegressionPoints] = useState<{ x: string, y: string, active: boolean }[]>([]);
  const [newX, setNewX] = useState('');
  const [newY, setNewY] = useState('');
  const [sampleY, setSampleY] = useState('');

  // Ref para rastrear a aba ativa dentro do loop de leitura serial (evita stale closures)
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const addPoint = () => {
    if (newX.trim() && newY.trim()) {
      setRegressionPoints([...regressionPoints, { x: newX.replace(',', '.'), y: newY.replace(',', '.'), active: true }]);
      setNewX('');
      setNewY('');
    }
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

  // Sincroniza a absorbância da amostra com base no comprimento de onda selecionado na varredura
  useEffect(() => {
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

    // Tolerância de 1nm para cobrir arredondamentos de diferentes equipamentos
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

  const effectiveAbs = sampleVal - blankVal;

  const resultConcentration = (epsVal * pathVal) !== 0 ? (effectiveAbs / (epsVal * pathVal)) * dilVal : 0;
  const resultAbsorbance = epsVal * pathVal * (inputConcVal / dilVal);

  const finalResult = calcMode === 'concentration' ? resultConcentration : resultAbsorbance;

  // Função para exportar o relatório PDF de Lambert-Beer
  const exportReportPdf = async () => {
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
      }
    );

    try {
      await fetch('/api/reports', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch (e) {
      console.warn('Failed to save report snapshot:', e);
    }

    openPrintableReport(payload);
  };

  // Função para limpar todos os campos
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

  // Função para processar texto de varredura (Wavelength Absorbance)
  const processDataStream = (text: string, clearFirst = false) => {
    const lines = text.split(/\r?\n/);
    const newScanMap: Record<string, string> = {};
    let foundCount = 0;
    
    lines.forEach(line => {
      // Remove aspas e espaços extras
      const cleanLine = line.replace(/"/g, '').trim();
      // Regex robusta: captura dois números separados por espaço, tab, vírgula, ponto-e-vírgula ou pipe (|)
      // Agora aceita o formato "Wavelength | Absorbance" do seu equipamento
      const matches = cleanLine.match(/(\d{3,4}(?:[.,]\d+)?)[,\s\t;|]+([-+]?\d+[.,]?\d*)/);
      
      if (matches && matches.length >= 3) {
        const wavelength = matches[1].replace(',', '.');
        const absorbance = matches[2].replace(',', '.');
        
        const wlNum = parseFloat(wavelength);
        const absNum = parseFloat(absorbance);
        // Filtra comprimentos de onda válidos e evita capturar ranges do cabeçalho (absorbância raramente > 4.0)
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
          
          const numericMatch = text.match(/(?<!\d)[-+]?\d*[.,]?\d+(?!\d)/);
          const val = numericMatch ? numericMatch[0].replace(',', '.') : null;

          if (activeTabRef.current === 'lambert-beer') {
            const { count } = processDataStream(text);
            if (count === 0 && val) setAbsSample(val);
          } else if (activeTabRef.current === 'linear-regression') {
            // Na regressão, geralmente recebemos um valor por vez do equipamento
            if (val) {
              setNewY(val);
            }
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
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const { count, map } = processDataStream(text, true); 
      
      if (count > 0) {
        // Auto-detecta o Pico (λ-max) para facilitar a vida do usuário
        const entries = Object.entries(map);
        const peak = entries.reduce((prev, curr) => 
          parseFloat(curr[1]) > parseFloat(prev[1]) ? curr : prev
        );
        
        setTargetWavelength(peak[0]);
        setAbsSample(peak[1]);
      } else {
        // Fallback: Tenta extrair um valor decimal isolado que pareça absorbância (entre 0.0 e 3.0)
        // Melhorado para evitar IDs grandes (ex: 2000)
        const numericMatch = text.match(/(?<!\d)[0-2][.,]\d{2,6}(?!\d)/);
        if (numericMatch) setAbsSample(numericMatch[0].replace(',', '.'));
      }
    };
    reader.readAsText(file);
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
        // Regex para capturar dois números (decimais ou inteiros) separados por delimitadores comuns
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
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = ''; // Reseta o input para permitir re-upload do mesmo arquivo
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">Standard Operating Procedures</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">Computational Protocols</h1>
          <p className="text-white/40 mt-1 max-w-2xl text-sm leading-relaxed">Version-controlled analytical methods, computational chemistry workflows and validated lab protocols.</p>
        </div>
        <div className="flex w-full md:w-auto flex-col sm:flex-row gap-4">
          <button className="px-6 py-4 bg-white/5 border border-white/5 text-white/60 text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-white/[0.08] hover:text-white transition-all rounded-xl">
            Import .MTD
          </button>
          <button className="px-8 py-4 bg-primary text-on-primary text-xs font-bold uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(167,200,255,0.3)] transition-all transform hover:scale-105 active:scale-95 rounded-xl">
            New Protocol
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('library')}
          className={`px-5 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
            activeTab === 'library'
              ? 'bg-primary text-on-primary border-primary shadow-[0_0_30px_rgba(167,200,255,0.2)]'
              : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.08]'
          }`}
        >
          Protocol Library
        </button>
        <button
          onClick={() => setActiveTab('lambert-beer')}
          className={`px-5 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
            activeTab === 'lambert-beer'
              ? 'bg-primary text-on-primary border-primary shadow-[0_0_30px_rgba(167,200,255,0.2)]'
              : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.08]'
          }`}
        >
          Lambert-Beer Calc
        </button>
        <button
          onClick={() => setActiveTab('linear-regression')}
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {methods.map((method) => (
            <div key={method.id} className="glass-panel p-5 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group hover:bg-white/[0.02] transition-all relative overflow-hidden border-white/[0.03] rounded-2xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8 min-w-0">
                <div className="relative">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 text-white/20 group-hover:text-primary group-hover:bg-primary/5 transition-all group-hover:scale-110">
                    <FileCode size={36} />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    {method.status === 'Approved' && (
                      <div className="p-1.5 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                        <Shield size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h3 className="text-xl font-display font-bold text-white leading-none group-hover:text-primary transition-colors">{method.name}</h3>
                    <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 py-0.5 px-2 rounded-full uppercase tracking-tighter font-bold">VER_{method.version}</span>
                  </div>
                  <p className="text-xs text-white/40 font-medium">Principal Architect: <span className="text-white/60 italic">{method.author}</span></p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${
                      method.status === 'Approved' ? 'text-green-400' :
                      method.status === 'Draft' ? 'text-yellow-400' :
                      'text-primary'
                    }`}>
                      {method.status}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">ACCESS: {method.lastAccess}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 opacity-100 lg:opacity-0 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 lg:group-hover:opacity-100 self-start lg:self-auto">
                <button title="Execute Method" className="p-3 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-on-primary rounded-xl transition-all shadow-lg hover:shadow-primary/20">
                  <Play size={20} fill="currentColor" />
                </button>
                <button title="Edit Protocol" className="p-3 bg-white/[0.03] border border-white/5 text-white/40 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all">
                  <Edit2 size={18} />
                </button>
                <button title="Clone Version" className="p-3 bg-white/[0.03] border border-white/5 text-white/40 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all">
                  <Copy size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'lambert-beer' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <section className="glass-panel rounded-[2rem] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
                  <Sigma size={22} />
                </div>
                <h2 className="text-xl font-display font-bold text-white">
                  {calcMode === 'concentration' ? 'Find Concentration (c)' : 'Find Absorbance (A)'}
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
                  title="Reset All Fields"
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <RotateCcw size={18} />
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  title="Import from file"
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
                  onClick={() => setCalcMode('concentration')}
                  className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest rounded-lg transition-all ${
                    calcMode === 'concentration' ? 'bg-primary text-on-primary shadow-lg' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Concentration
                </button>
                <button
                  onClick={() => setCalcMode('absorbance')}
                  className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest rounded-lg transition-all ${
                    calcMode === 'absorbance' ? 'bg-primary text-on-primary shadow-lg' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Absorbance
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {calcMode === 'concentration' ? (
                <>
                  <label className="block space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Target Wavelength (nm)</span>
                    <div className="relative">
                      <input type="number" step="1" value={targetWavelength} onChange={(e) => setTargetWavelength(e.target.value)} placeholder="Ex: 400" className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
                  {targetWavelength && Object.keys(scanMap).some(wl => Math.abs(Number.parseFloat(wl.replace(',', '.')) - Number.parseFloat(targetWavelength)) <= 1.0) && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono text-green-400 bg-green-400/10 px-2 py-1 rounded shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                      MATCH FOUND
                    </span>
                      )}
                    </div>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Absorbance (A)</span>
                    <input type="number" step="any" value={absSample} onChange={(e) => setAbsSample(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Blank (Baseline)</span>
                    <input type="number" step="any" value={absBlank} onChange={(e) => setAbsBlank(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
                  </label>
                </>
              ) : (
                <label className="block space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Target Conc. (mol/L)</span>
                  <input type="number" step="any" value={inputConcentration} onChange={(e) => setInputConcentration(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
                </label>
              )}
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Molar Coeff. (ε)</span>
                <input type="number" step="any" value={epsilon} onChange={(e) => setEpsilon(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
              </label>
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Path Length (cm)</span>
                <input type="number" step="any" value={pathLength} onChange={(e) => setPathLength(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
              </label>
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Dilution Factor (DF)</span>
                <input type="number" step="any" min="1" value={dilutionFactor} onChange={(e) => setDilutionFactor(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" />
              </label>
            </div>
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
                  <p className="text-[10px] font-mono uppercase text-white/30 mb-2 tracking-widest">Effective Absorbance (A)</p>
                  <p className="text-white font-mono">{sampleVal} - {blankVal} = <span className="text-primary font-bold">{effectiveAbs.toFixed(4)} AU</span></p>
                </div>
                )}
                <div className="p-4 rounded-2xl bg-[#08101f]/60 border border-white/5">
                  <p className="text-[10px] font-mono uppercase text-white/30 mb-2 tracking-widest">Applied Formula</p>
                  <p className="text-sm text-white/80 leading-relaxed italic">
                    {calcMode === 'concentration' ? 'c = (A / (ε · l)) · DF' : 'A = ε · l · (c / DF)'}
                  </p>
                  {calcMode === 'concentration' ? (
                  <p className="text-xs text-white/40 mt-1">
                    c = ({effectiveAbs.toFixed(4)} / ({epsVal} · {pathVal})) · {dilVal}
                  </p>
                  ) : (
                  <p className="text-xs text-white/40 mt-1">
                    A = {epsVal} · {pathVal} · ({inputConcVal} / {dilVal})
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
                onClick={exportReportPdf}
                  className="inline-flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-primary text-on-primary text-[10px] font-mono uppercase tracking-[0.25em] font-bold hover:shadow-[0_0_30px_rgba(167,200,255,0.28)] transition-all w-full sm:w-auto"
                >
                  <Download size={16} />
                  Print PDF Report
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Applied Formula</p>
                  <p className="text-white mt-2 font-semibold break-words">
                    {calcMode === 'concentration' ? 'c = (A / (ε · l)) · DF' : 'A = ε · l · (c / DF)'}
                  </p>
                  <p className="text-xs text-white/45 mt-2">Target: {calcMode === 'concentration' ? 'Concentration' : 'Absorbance'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Wavelength</p>
                  <p className="text-white mt-2 font-semibold">{targetWavelength || 'N/A'} nm</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Molar Coeff. (ε)</p>
                  <p className="text-white mt-2 font-semibold">{formatNumber(epsVal)} M⁻¹cm⁻¹</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Path Length (l)</p>
                  <p className="text-white mt-2 font-semibold">{formatNumber(pathVal)} cm</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Dilution Factor</p>
                  <p className="text-white mt-2 font-semibold">{formatNumber(dilVal)}x</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <p className="text-white/30 font-mono uppercase tracking-widest">Calculation Result</p>
                  <p className="text-white mt-2 font-semibold">
                    {formatNumber(finalResult)} {calcMode === 'concentration' ? 'mol/L' : 'AU'}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-[#08101f] border border-white/8 p-5 font-mono text-sm text-white/80">
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
          <section className="glass-panel rounded-[2rem] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
                  <TrendingUp size={22} />
                </div>
                <h2 className="text-xl font-display font-bold text-white">Data Calibration Curve</h2>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="file" 
                  ref={regressionFileInputRef} 
                  onChange={handleRegressionFileImport} 
                  className="hidden" 
                  accept=".csv,.txt,.log" 
                />
                <button 
                  onClick={() => setRegressionPoints([])}
                  title="Clear All Points"
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <RotateCcw size={18} />
                </button>
                <button 
                  onClick={() => regressionFileInputRef.current?.click()}
                  title="Import Points from File"
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

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Concentração (X - mol/L)</span>
                <input type="number" step="any" value={newX} onChange={(e) => setNewX(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" placeholder="0.00" />
              </label>
              <label className="block space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Absorbância (Y - AU)</span>
                <div className="flex gap-2">
                  <input type="number" step="any" value={newY} onChange={(e) => setNewY(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-white outline-none focus:border-primary/30" placeholder="0.00" />
                  <button onClick={addPoint} className="p-3 bg-primary text-on-primary rounded-xl hover:scale-105 transition-all"><Plus size={20} /></button>
                </div>
              </label>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {regressionPoints.length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl text-white/20 text-xs font-mono uppercase tracking-widest">No data points added</div>
              )}
              {regressionPoints.map((point, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${
                  point.active ? 'bg-white/[0.03] border-white/5' : 'bg-red-500/5 border-red-500/10 opacity-50'
                }`}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => togglePointActive(idx)}
                      className={`transition-colors ${point.active ? 'text-primary' : 'text-white/20'}`}
                      title={point.active ? "Desativar ponto" : "Ativar ponto"}
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
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-secondary font-bold">Linear Equation & Correlation</p>
                  {(() => {
                    const results = calculateRegression();
                    const activeCount = regressionPoints.filter(p => p.active).length;
                    if (!results) return (
                      <p className="text-sm font-mono text-white/20 mt-2 italic">
                        {activeCount < 5 ? `Min. 5 active points required (${activeCount}/5)` : 'Invalid data'}
                      </p>
                    );
                    return (
                      <div className="space-y-2 mt-2">
                        <p className="text-3xl font-display font-bold text-white">
                          y = {results.slope.toFixed(4)}x {results.intercept >= 0 ? '+' : '-'} {Math.abs(results.intercept).toFixed(4)}
                        </p>
                        <p className="text-sm font-mono text-primary font-bold">R² = {results.r2.toFixed(6)}</p>
                      </div>
                    );
                  })()}
                </div>

                {/* Sample Analysis Field */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-4">Sample Quantification</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <label className="block space-y-2">
                      <span className="text-[10px] font-mono text-secondary uppercase tracking-widest">Sample Absorbance (Y)</span>
                      <input type="number" step="any" value={sampleY} onChange={(e) => setSampleY(e.target.value)} className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3 text-white outline-none focus:border-secondary/40" placeholder="0.000" />
                    </label>
                    <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4">
                      <p className="text-[10px] font-mono uppercase text-secondary/60 tracking-widest">Calculated Conc. (X)</p>
                      <p className="text-xl font-display font-bold text-white mt-1">
                        {(() => {
                          const results = calculateRegression();
                          const yVal = parseFloat(sampleY);
                          if (!results || isNaN(yVal) || results.slope === 0) return '---';
                          const xVal = (yVal - results.intercept) / results.slope;
                          return xVal.toFixed(6);
                        })()} <span className="text-xs font-mono text-white/40">mol/L</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-[#0b1121]/40 border border-white/10 text-secondary">
                  <Sigma size={32} />
                </div>
              </div>

              {/* Chart Visualization */}
              <div className="relative w-full aspect-video bg-[#08101f]/60 rounded-2xl border border-white/5 p-6 overflow-hidden">
                {(() => {
                  const allValid = regressionPoints
                    .map((p, i) => ({ x: parseFloat(p.x), y: parseFloat(p.y), active: p.active, originalIndex: i }))
                    .filter(p => !isNaN(p.x) && !isNaN(p.y));

                  if (allValid.length === 0) return (
                    <div className="h-full flex flex-col items-center justify-center text-white/10 gap-3">
                      <TrendingUp size={48} className="opacity-5" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Waiting for data points</span>
                    </div>
                  );

                  const results = calculateRegression();
                  const padding = 40;
                  const width = 400;
                  const height = 240;
                  
                  // Usamos todos os pontos para manter a escala do gráfico fixa
                  const minX = Math.min(...allValid.map(p => p.x));
                  const maxX = Math.max(...allValid.map(p => p.x));
                  const minY = Math.min(...allValid.map(p => p.y));
                  const maxY = Math.max(...allValid.map(p => p.y));
                  
                  const rangeX = (maxX - minX) || 1;
                  const rangeY = (maxY - minY) || 1;
                  
                  const scaleX = (val: number) => padding + (val - minX) / rangeX * (width - 2 * padding);
                  const scaleY = (val: number) => height - padding - (val - minY) / rangeY * (height - 2 * padding);

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                      {/* Grid */}
                      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" />
                      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" />
                      
                      {/* Regression Line */}
                      {results && (
                        <line 
                          x1={scaleX(minX)} y1={scaleY(results.slope * minX + results.intercept)} 
                          x2={scaleX(maxX)} y2={scaleY(results.slope * maxX + results.intercept)} 
                          stroke="#76f3ea" strokeWidth="2" strokeDasharray="4"
                          className="opacity-60"
                        />
                      )}
                      
                      {/* Data Points */}
                      {allValid.map((p) => (
                        <circle 
                          key={p.originalIndex} 
                          cx={scaleX(p.x)} 
                          cy={scaleY(p.y)} 
                          r="5" 
                          fill={p.active ? "#a7c8ff" : "rgba(239, 68, 68, 0.3)"}
                          stroke={p.active ? "none" : "#ef4444"}
                          strokeWidth={p.active ? "0" : "1"}
                          onClick={() => togglePointActive(p.originalIndex)}
                          className={`cursor-pointer transition-all duration-300 hover:r-7 ${p.active ? 'drop-shadow-[0_0_8px_rgba(167,200,255,0.8)]' : 'hover:fill-red-500/50'}`}
                        />
                      ))}
                    </svg>
                  );
                })()}
              </div>
            </div>
            <button className="w-full py-4 bg-white/5 border border-white/10 text-white/60 text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-white/[0.08] hover:text-white transition-all rounded-xl flex items-center justify-center gap-2">
              Export Calibration Report
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
