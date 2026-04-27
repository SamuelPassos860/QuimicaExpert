import { FileCode, Play, Edit2, Copy, Shield } from 'lucide-react';

const methods = [
  { id: 'MTD-01', name: 'Alkaloid Extraction V2', author: 'Dr. Aris Thorne', lastAccess: 'Yesterday', version: '2.4.1', status: 'Approved' },
  { id: 'MTD-02', name: 'Trace Metal Quantification', author: 'Elena Rossi', lastAccess: '3 days ago', version: '1.0.8', status: 'Draft' },
  { id: 'MTD-03', name: 'Organoleptic Testing Suite', author: 'AI Core', lastAccess: '1 week ago', version: '4.2.0', status: 'Automated' },
  { id: 'MTD-04', name: 'Rapid Pesticide Screening', author: 'Kevin Wu', lastAccess: '2 weeks ago', version: '3.1.2', status: 'Approved' },
];

export default function Methods() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">Standard Operating Procedures</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">Computational Protocols</h1>
          <p className="text-white/40 mt-1 max-w-2xl text-sm leading-relaxed">Version-controlled analytical methods, computational chemistry workflows and validated lab protocols.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-4 bg-white/5 border border-white/5 text-white/60 text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-white/[0.08] hover:text-white transition-all rounded-xl">
            Import .MTD
          </button>
          <button className="px-8 py-4 bg-primary text-on-primary text-xs font-bold uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(167,200,255,0.3)] transition-all transform hover:scale-105 active:scale-95 rounded-xl">
            New Protocol
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {methods.map((method) => (
          <div key={method.id} className="glass-panel p-8 flex items-center justify-between group hover:bg-white/[0.02] transition-all relative overflow-hidden border-white/[0.03]">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-8">
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
              <div className="space-y-2">
                <div className="flex items-center gap-3">
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

            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
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
    </div>
  );
}
