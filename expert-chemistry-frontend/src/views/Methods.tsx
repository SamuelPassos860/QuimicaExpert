import { useState } from 'react';
import { FileCode, Play, Edit2, Copy, Shield, Sigma, Waves, Calculator } from 'lucide-react';

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

export default function Methods() {
  const [activeTab, setActiveTab] = useState<'library' | 'lambert-beer'>('library');
  
  // States para a Calculadora Lambert-Beer
  const [calcMode, setCalcMode] = useState<'concentration' | 'absorbance'>('concentration');
  const [absSample, setAbsSample] = useState('0');
  const [absBlank, setAbsBlank] = useState('0');
  const [epsilon, setEpsilon] = useState('0');
  const [pathLength, setPathLength] = useState('1');
  const [dilutionFactor, setDilutionFactor] = useState('1');
  const [inputConcentration, setInputConcentration] = useState('0');

  const sampleVal = Number.parseFloat(absSample) || 0;
  const blankVal = Number.parseFloat(absBlank) || 0;
  const epsVal = Number.parseFloat(epsilon) || 0;
  const pathVal = Number.parseFloat(pathLength) || 0;
  const dilVal = Number.parseFloat(dilutionFactor) || 1;
  const inputConcVal = Number.parseFloat(inputConcentration) || 0;

  const effectiveAbs = sampleVal - blankVal;

  const resultConcentration = (epsVal * pathVal) !== 0 ? (effectiveAbs / (epsVal * pathVal)) * dilVal : 0;
  const resultAbsorbance = epsVal * pathVal * (inputConcVal / dilVal);

  const finalResult = calcMode === 'concentration' ? resultConcentration : resultAbsorbance;

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
      </div>

      {activeTab === 'library' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {methods.map((method) => (
            <div key={method.id} className="glass-panel p-5 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group hover:bg-white/[0.02] transition-all relative overflow-hidden border-white/[0.03] rounded-2xl">
              {/* ... conteúdo existente do card de método ... */}
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <section className="glass-panel rounded-[2rem] p-6 sm:p-8 space-y-6">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
                  <Sigma size={22} />
                </div>
                <h2 className="text-xl font-display font-bold text-white">
                  {calcMode === 'concentration' ? 'Find Concentration (c)' : 'Find Absorbance (A)'}
                </h2>
              </div>

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
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Sample Absorbance</span>
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

          <section className="glass-panel rounded-[2rem] p-6 sm:p-8 bg-gradient-to-br from-primary/10 to-transparent border-primary/10">
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

            <button className="w-full mt-8 py-4 bg-secondary text-on-secondary rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest hover:shadow-[0_0_30px_rgba(118,243,234,0.3)] transition-all flex items-center justify-center gap-2">
              <Calculator size={16} /> Export Calculation
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
