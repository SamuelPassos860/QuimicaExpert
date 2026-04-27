import { FileText, Download, Eye, ExternalLink } from 'lucide-react';

const reports = [
  { id: 'REP-2024-001', title: 'Molecular Stability Analysis', client: 'PharmaCore Int.', date: '2024-04-18', status: 'Verified' },
  { id: 'REP-2024-002', title: 'Toxicity Screening - Batch X-22', client: 'GreenChem Solutions', date: '2024-04-15', status: 'Pending Review' },
  { id: 'REP-2024-003', title: 'Water Purity Quality Control', client: 'Metro Water Dept.', date: '2024-04-12', status: 'Verified' },
  { id: 'REP-2024-004', title: 'Synthetic Polymer Degradation', client: 'PolyWorks Ltd.', date: '2024-04-10', status: 'Archived' },
];

export default function Reports() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-secondary uppercase tracking-[0.4em] font-bold">Analysis Output</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">Technical Reports</h1>
          <p className="text-white/40 mt-1 max-w-2xl text-sm leading-relaxed">Generated analytical reports, validation certificates and secure compliance logs for stakeholder review.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="glass-panel p-8 flex flex-col justify-between group hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-secondary group-hover:bg-secondary/10 group-hover:scale-110 transition-all group-hover:shadow-[0_0_20px_rgba(118,243,234,0.1)]">
                  <FileText size={24} />
                </div>
                <div className="flex gap-2">
                  <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-white/30 hover:text-white hover:bg-white/[0.08] transition-all">
                    <Download size={18} />
                  </button>
                  <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-white/30 hover:text-white hover:bg-white/[0.08] transition-all">
                    <Eye size={18} />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-white group-hover:text-primary transition-colors leading-tight">{report.title}</h3>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs font-medium text-white/40">{report.client}</span>
                  <span className="w-1 h-1 rounded-full bg-white/10" />
                  <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest">{report.id}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/[0.03] flex items-center justify-between relative z-10 font-mono">
              <div className="flex flex-col">
                <span className="text-[8px] text-white/20 uppercase tracking-[0.3em] mb-1 font-bold">Authenticated_Date</span>
                <span className="text-xs text-white/60 font-bold">{report.date}</span>
              </div>
              <span className={`text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border ${
                report.status === 'Verified' ? 'text-green-400 bg-green-400/5 border-green-400/20' :
                report.status === 'Pending Review' ? 'text-yellow-400 bg-yellow-400/5 border-yellow-400/20' :
                'text-white/20 bg-white/5 border-white/10'
              }`}>
                {report.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6">
        <button className="w-full py-6 glass-panel border-dashed border-white/10 hover:bg-white/[0.03] hover:border-primary/30 transition-all flex items-center justify-center gap-3 text-white/20 hover:text-primary text-[10px] font-mono uppercase tracking-[0.4em] font-bold group">
          <ExternalLink size={16} className="group-hover:rotate-12 transition-transform" /> Access Encrypted Archive
        </button>
      </div>
    </div>
  );
}
