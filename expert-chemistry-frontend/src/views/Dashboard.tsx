import { motion } from 'motion/react';
import { 
  Activity, 
  FlaskConical, 
  Users, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';

const stats = [
  { label: 'Active Projects', value: '12', icon: FlaskConical, color: 'text-primary' },
  { label: 'Pending Reports', value: '5', icon: FileText, color: 'text-secondary' },
  { label: 'Client Base', value: '124', icon: Users, color: 'text-blue-500' },
  { label: 'Lab Efficiency', value: '94%', icon: Activity, color: 'text-green-500' },
];

const developments = [
  { id: 1, type: 'status', message: 'Mass Spectrometer MS-04 maintenance complete', time: '2 hours ago', icon: CheckCircle2, iconColor: 'text-green-500' },
  { id: 2, type: 'warning', message: 'Reagent inventory for HPLC low - Restock needed', time: '4 hours ago', icon: AlertCircle, iconColor: 'text-red-500' },
  { id: 3, type: 'info', message: 'New method validation for Client: BioVantage Labs', time: '5 hours ago', icon: Clock, iconColor: 'text-blue-500' },
];

export default function Dashboard() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_10px_rgba(118,243,234,0.5)]" />
          <span className="text-[10px] font-mono text-secondary uppercase tracking-[0.4em] font-bold">System Overview</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-white tracking-tight">Executive Dashboard</h1>
        <p className="text-white/40 mt-1 max-w-2xl text-sm leading-relaxed">Real-time laboratory operations, high-precision performance metrics and automated system diagnostics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel glass-panel-hover p-6 group"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={`p-3 rounded-xl bg-white/[0.03] border border-white/5 transition-all group-hover:scale-110 group-hover:border-white/10 ${stat.color}`}>
                <stat.icon size={22} />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1">Frequency</span>
                <span className="text-[10px] font-mono text-secondary">2.4 GHz</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-white/40 text-xs font-mono uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-display font-bold text-white group-hover:glow-text transition-all">{stat.value}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-secondary">
                <TrendingUp size={12} />
                <span className="font-bold">+4.2%</span>
              </div>
              <span className="text-white/20">DELTA_T: 24H</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-display font-bold text-white tracking-tight">System Feed</h2>
              <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[10px] font-mono font-bold border border-secondary/20">EVENT_STREAM</span>
            </div>
            <button className="text-[10px] font-mono text-white/30 hover:text-primary transition-all uppercase tracking-[0.2em] hover:bg-white/5 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/5">
              Access Full Log
            </button>
          </div>
          <div className="glass-panel overflow-hidden border-white/[0.03]">
            <div className="divide-y divide-white/[0.03]">
              {developments.map((dev) => (
                <div key={dev.id} className="p-5 flex items-start gap-5 hover:bg-white/[0.02] transition-all group cursor-pointer relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className={`mt-1 p-2 rounded-lg bg-white/[0.03] border border-white/5 ${dev.iconColor} group-hover:scale-110 transition-transform`}>
                    <dev.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-sm text-white/80 font-medium group-hover:text-white transition-colors">{dev.message}</p>
                      <span className="text-[10px] font-mono text-white/20 whitespace-nowrap ml-4">{dev.time}</span>
                    </div>
                    <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest mt-1">PID: 0x42A{dev.id} • ORIGIN: LAB_NET_01</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <ChevronRight size={16} className="text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions / Performance */}
        <div className="space-y-6">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">Environmental Core</h2>
          <div className="glass-panel p-8 space-y-8 border-white/[0.03]">
            {[
              { label: 'Compute Clusters', value: 24, color: 'bg-primary' },
              { label: 'Storage Array', value: 68, color: 'bg-secondary' },
              { label: 'Network Latency', value: 12, color: 'bg-blue-400' }
            ].map((item) => (
              <div key={item.label} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-mono text-white/40 uppercase tracking-widest">{item.label}</span>
                  <span className="text-xs font-mono text-white/60 font-bold">{item.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.02] border border-white/5 rounded-full overflow-hidden p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`h-full ${item.color} rounded-full shadow-[0_0_15px_rgba(118,243,234,0.3)]`} 
                  />
                </div>
              </div>
            ))}

            <div className="pt-8 border-t border-white/[0.03]">
              <button className="w-full py-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-primary/20 transition-all text-[10px] font-mono text-white uppercase tracking-[0.3em] font-bold group relative overflow-hidden">
                <span className="relative z-10">Initialize System Diagnostic</span>
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
