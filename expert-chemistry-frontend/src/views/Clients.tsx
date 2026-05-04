import { Users, Mail, Phone, MapPin, ChevronRight } from 'lucide-react';

const clients = [
  { id: 1, name: 'PharmaCore International', contact: 'Dr. Elena Rossi', email: 'e.rossi@pharmacore.com', projects: 14, industry: 'Pharmaceuticals' },
  { id: 2, name: 'GreenChem Solutions', contact: 'Marcus Thorne', email: 'm.thorne@greenchem.io', projects: 8, industry: 'Sustainable Materials' },
  { id: 3, name: 'Metro Water Quality', contact: 'Sarah Jenkins', email: 's.jenkins@metrowater.gov', projects: 22, industry: 'Utilities' },
  { id: 4, name: 'BioVantage Labs', contact: 'Dr. Kevin Wu', email: 'k.wu@biovantage.rest', projects: 5, industry: 'Biotechnology' },
];

export default function Clients() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">Alliance Network</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">Partner Registry</h1>
          <p className="text-white/40 mt-1 max-w-2xl text-sm leading-relaxed">Directory of commercial and institutional clients under master service agreements and regulatory compliance.</p>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1 font-bold">Node_Active</p>
            <p className="text-3xl font-display font-bold text-white leading-none">{clients.length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {clients.map((client) => (
          <div key={client.id} className="glass-panel group hover:border-primary/30 transition-all cursor-pointer overflow-hidden flex flex-col md:flex-row relative border-white/[0.03] rounded-2xl">
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-white/[0.05] group-hover:bg-primary group-hover:shadow-[0_0_15px_rgba(167,200,255,0.5)] transition-all" />
            <div className="p-5 sm:p-8 flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-10">
              <div className="md:col-span-1 space-y-2">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em] font-bold">Entity_ID: 0x{client.id}F</p>
                <h3 className="text-white font-bold text-xl leading-tight group-hover:text-primary transition-colors">{client.name}</h3>
                <span className="inline-block px-2 py-0.5 rounded bg-white/[0.03] border border-white/5 text-[9px] text-white/40 font-mono font-bold uppercase tracking-widest">{client.industry}</span>
              </div>
              
              <div className="md:col-span-1 space-y-3">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em] font-bold">Liaison_Data</p>
                <p className="text-sm text-white/80 font-medium group-hover:text-white">{client.contact}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-white/30 hover:text-primary hover:bg-primary/10 transition-all"><Mail size={14}/></button>
                  <button className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-white/30 hover:text-primary hover:bg-primary/10 transition-all"><Phone size={14}/></button>
                  <button className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-white/30 hover:text-primary hover:bg-primary/10 transition-all"><MapPin size={14}/></button>
                </div>
              </div>

              <div className="md:col-span-1 space-y-3">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em] font-bold">Engagement_Metrics</p>
                <p className="text-sm text-white/70 font-mono"><span className="text-secondary font-bold">{client.projects}</span> UNITS_PROCESSED</p>
                <div className="mt-3 flex gap-1.5 h-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`flex-1 rounded-full shadow-[0_0_8px_rgba(118,243,234,0.2)] ${i < 4 ? 'bg-secondary' : 'bg-white/[0.03]'}`} />
                  ))}
                </div>
              </div>

              <div className="md:col-span-1 flex items-center justify-start md:justify-end px-0 md:px-4">
                <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all group-hover:translate-x-2 group-hover:shadow-[0_0_20px_rgba(167,200,255,0.2)]">
                  <ChevronRight size={24} className="text-white/20 group-hover:text-on-primary transition-colors" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
