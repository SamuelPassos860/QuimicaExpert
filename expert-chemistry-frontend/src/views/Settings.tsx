import { Settings as SettingsIcon, Bell, Shield, Database, Monitor, Globe } from 'lucide-react';

export default function Settings() {
  const sections = [
    { 
      title: 'Environment Preferences', 
      icon: Monitor,
      items: [
        { label: 'Theme Configuration', desc: 'Adjust color calibration, contrast and glass intensity.', action: 'Custom' },
        { label: 'Display Resolution', desc: 'Optimize UI for external lab monitors or holographic displays.', action: '8K_RAW' },
      ]
    },
    { 
      title: 'Security & Access', 
      icon: Shield,
      items: [
        { label: 'Biometric Gateway', desc: 'Secure login via retinal scan or neural fingerprint ID.', action: 'Active' },
        { label: 'Audit Log Chain', desc: 'View high-precision cryptographic logs of every interaction.', action: 'Access' },
      ]
    },
    { 
      title: 'Data Lifecycle', 
      icon: Database,
      items: [
        { label: 'Auto-Archive Policies', desc: 'Define how long experimental data is kept on-site before offloading.', action: '365_STD' },
        { label: 'External DB Sync', desc: 'Manage connections to cloud-based molecular databases.', action: 'Link' },
      ]
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono text-secondary uppercase tracking-[0.4em] font-bold">System Configuration</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-white tracking-tight">Core Infrastructure</h1>
        <p className="text-white/40 mt-1 max-w-2xl text-sm leading-relaxed">Global laboratory parameters, advanced security protocols, hardware integration settings and environment variables.</p>
      </div>

      <div className="space-y-12">
        {sections.map((section) => (
          <div key={section.title} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary">
                <section.icon size={18} />
              </div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-white/50">{section.title}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {section.items.map((item) => (
                <div key={item.label} className="glass-panel p-8 flex items-start justify-between group hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden rounded-2xl border-white/[0.03]">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] rounded-bl-full border-l border-b border-white/[0.03] transition-colors group-hover:bg-primary/5 group-hover:border-primary/20" />
                  <div className="space-y-2 pr-4 relative z-10">
                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors tracking-tight">{item.label}</h3>
                    <p className="text-xs text-white/30 leading-relaxed max-w-[220px] font-medium">{item.desc}</p>
                  </div>
                  <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl text-[9px] font-mono text-white/40 uppercase tracking-[0.2em] font-bold group-hover:border-primary/40 group-hover:text-primary group-hover:bg-primary/5 transition-all relative z-10 whitespace-nowrap">
                    {item.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-12 border-t border-white/[0.05] flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm text-white font-bold italic tracking-wide group flex items-center gap-2 cursor-default">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            STABLE_ENGINE: <span className="text-primary font-mono not-italic">v2.8.4_AURORA</span>
          </p>
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em] font-bold">SHA-256: 0x82f4...0a91</p>
        </div>
        <button className="px-10 py-4 bg-error/10 border border-error/20 text-error text-[10px] font-mono font-bold uppercase tracking-[0.3em] hover:bg-error hover:text-on-error transition-all rounded-2xl shadow-lg hover:shadow-error/30 active:scale-95">
          Emergency Node Shutdown
        </button>
      </div>
    </div>
  );
}
