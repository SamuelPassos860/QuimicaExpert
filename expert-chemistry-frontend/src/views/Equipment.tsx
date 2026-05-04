import { motion } from 'motion/react';
import { FlaskConical, Search, Filter } from 'lucide-react';

const equipment = [
  { id: 'MS-04', name: 'Mass Spectrometer', status: 'Operational', usage: 82, lastCalibration: '2024-03-12' },
  { id: 'LC-12', name: 'Liquid Chromatograph', status: 'In Use', usage: 100, lastCalibration: '2024-02-28' },
  { id: 'GC-08', name: 'Gas Chromatograph', status: 'Maintenance', usage: 0, lastCalibration: '2024-04-01' },
  { id: 'US-01', name: 'Ultrasonic Cleaner', status: 'Operational', usage: 45, lastCalibration: '2023-11-15' },
];

export default function Equipment() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">Hardware Registry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">Laboratory Assets</h1>
          <p className="text-white/40 mt-1 max-w-2xl text-sm leading-relaxed">Management, calibration cycles and real-time status monitoring of critical analytical instrumentation.</p>
        </div>
        <button className="w-full sm:w-auto px-8 py-4 bg-primary text-on-primary text-xs font-bold uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(167,200,255,0.3)] transition-all transform hover:scale-105 active:scale-95 rounded-xl">
          Register New Unit
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5 glass-panel sm:items-center border-white/[0.03] rounded-2xl">
        <div className="flex items-center gap-3 w-full">
        <Search className="text-white/20 ml-2 shrink-0" size={20} />
        <input 
          type="text" 
          placeholder="Filter assets by serial, type, or zone..." 
          className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/20 text-sm font-mono"
        />
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-2.5 hover:bg-white/5 rounded-xl text-white/40 text-[10px] font-mono uppercase tracking-widest border border-white/5 transition-all hover:text-white w-full sm:w-auto">
          <Filter size={14} /> Refine View
        </button>
      </div>

      <div className="glass-panel overflow-hidden border-white/[0.03] rounded-2xl shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.03] bg-white/[0.01]">
                <th className="px-4 sm:px-8 py-6 text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] font-bold">Serial_ID</th>
                <th className="px-4 sm:px-8 py-6 text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] font-bold">Asset Nomenclature</th>
                <th className="px-4 sm:px-8 py-6 text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] font-bold">Operational Status</th>
                <th className="px-4 sm:px-8 py-6 text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] font-bold">Load Factor</th>
                <th className="px-4 sm:px-8 py-6 text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] font-bold">Calibration_T</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {equipment.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer relative">
                  <td className="px-4 sm:px-8 py-6 text-sm font-mono text-primary font-bold group-hover:glow-text">{item.id}</td>
                  <td className="px-4 sm:px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-white/20 group-hover:text-primary group-hover:border-primary/20 transition-all group-hover:scale-110">
                        <FlaskConical size={18} />
                      </div>
                      <span className="text-sm text-white font-medium tracking-wide">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-8 py-6">
                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-widest border ${
                      item.status === 'Operational' ? 'bg-green-500/5 text-green-400 border-green-500/20' :
                      item.status === 'In Use' ? 'bg-blue-500/5 text-blue-400 border-blue-500/20' :
                      'bg-red-500/5 text-red-400 border-red-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-1.5 w-32 bg-white/[0.03] border border-white/5 rounded-full overflow-hidden p-0.5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.usage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(167,200,255,0.4)]" 
                        />
                      </div>
                      <span className="text-[10px] font-mono text-white/40 font-bold">{item.usage}%</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-8 py-6 text-xs text-white/40 font-mono tracking-tighter">{item.lastCalibration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
