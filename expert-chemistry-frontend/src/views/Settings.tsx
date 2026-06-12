import { Shield, Database, Monitor } from 'lucide-react';
import { Language, useLanguage } from '../i18n';

const SETTINGS_TEXT: Record<Language, {
  eyebrow: string;
  title: string;
  subtitle: string;
  stableLabel: string;
  shutdown: string;
  sections: Array<{
    title: string;
    items: Array<{ label: string; desc: string; action: string }>;
  }>;
}> = {
  en: {
    eyebrow: 'System Configuration',
    title: 'Core Infrastructure',
    subtitle: 'Global laboratory parameters, advanced security protocols, hardware integration settings and environment variables.',
    stableLabel: 'STABLE_ENGINE',
    shutdown: 'Emergency Node Shutdown',
    sections: [
      {
        title: 'Environment Preferences',
        items: [
          { label: 'Theme Configuration', desc: 'Adjust color calibration, contrast and glass intensity.', action: 'Custom' },
          { label: 'Display Resolution', desc: 'Optimize UI for external lab monitors or holographic displays.', action: '8K_RAW' }
        ]
      },
      {
        title: 'Security & Access',
        items: [
          { label: 'Biometric Gateway', desc: 'Secure login via retinal scan or neural fingerprint ID.', action: 'Active' },
          { label: 'Audit Log Chain', desc: 'View high-precision cryptographic logs of every interaction.', action: 'Access' }
        ]
      },
      {
        title: 'Data Lifecycle',
        items: [
          { label: 'Auto-Archive Policies', desc: 'Define how long experimental data is kept on-site before offloading.', action: '365_STD' },
          { label: 'External DB Sync', desc: 'Manage connections to cloud-based molecular databases.', action: 'Link' }
        ]
      }
    ]
  },
  pt: {
    eyebrow: 'Configuração do Sistema',
    title: 'Infraestrutura Central',
    subtitle: 'Parâmetros globais do laboratório, protocolos avançados de segurança, integração de hardware e variáveis de ambiente.',
    stableLabel: 'MOTOR_ESTAVEL',
    shutdown: 'Desligamento de Emergência',
    sections: [
      {
        title: 'Preferências do Ambiente',
        items: [
          { label: 'Configuração de Tema', desc: 'Ajuste calibração de cor, contraste e intensidade do vidro.', action: 'Personalizar' },
          { label: 'Resolução da Tela', desc: 'Otimize a interface para monitores externos de laboratório ou telas holográficas.', action: '8K_RAW' }
        ]
      },
      {
        title: 'Segurança e Acesso',
        items: [
          { label: 'Gateway Biométrico', desc: 'Login seguro via leitura retinal ou identificação neural.', action: 'Ativo' },
          { label: 'Cadeia de Auditoria', desc: 'Veja registros criptográficos de alta precisão de cada interação.', action: 'Acessar' }
        ]
      },
      {
        title: 'Ciclo de Vida dos Dados',
        items: [
          { label: 'Políticas de Autoarquivo', desc: 'Defina por quanto tempo os dados experimentais ficam no local antes do envio.', action: '365_STD' },
          { label: 'Sincronização de DB Externo', desc: 'Gerencie conexões com bancos moleculares em nuvem.', action: 'Vincular' }
        ]
      }
    ]
  },
  es: {
    eyebrow: 'Configuración del Sistema',
    title: 'Infraestructura Central',
    subtitle: 'Parámetros globales del laboratorio, protocolos avanzados de seguridad, integración de hardware y variables de entorno.',
    stableLabel: 'MOTOR_ESTABLE',
    shutdown: 'Apagado de Emergencia',
    sections: [
      {
        title: 'Preferencias del Entorno',
        items: [
          { label: 'Configuración de Tema', desc: 'Ajusta calibración de color, contraste e intensidad del vidrio.', action: 'Personalizar' },
          { label: 'Resolución de Pantalla', desc: 'Optimiza la interfaz para monitores externos de laboratorio o pantallas holográficas.', action: '8K_RAW' }
        ]
      },
      {
        title: 'Seguridad y Acceso',
        items: [
          { label: 'Gateway Biométrico', desc: 'Inicio seguro mediante escaneo retinal o identificación neural.', action: 'Activo' },
          { label: 'Cadena de Auditoría', desc: 'Consulta registros criptográficos de alta precisión de cada interacción.', action: 'Acceder' }
        ]
      },
      {
        title: 'Ciclo de Vida de Datos',
        items: [
          { label: 'Políticas de Autoarchivo', desc: 'Define cuánto tiempo se conservan los datos experimentales antes de enviarlos.', action: '365_STD' },
          { label: 'Sincronización de DB Externa', desc: 'Gestiona conexiones con bases moleculares en la nube.', action: 'Vincular' }
        ]
      }
    ]
  }
};

export default function Settings() {
  const { language } = useLanguage();
  const text = SETTINGS_TEXT[language];
  const sectionIcons = [Monitor, Shield, Database];

  return (
    <div className="max-w-5xl mx-auto space-y-10 sm:space-y-12">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono text-secondary uppercase tracking-[0.4em] font-bold">{text.eyebrow}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">{text.title}</h1>
        <p className="text-white/40 mt-1 max-w-2xl text-sm leading-relaxed">{text.subtitle}</p>
      </div>

      <div className="space-y-12">
        {text.sections.map((section, sectionIndex) => {
          const SectionIcon = sectionIcons[sectionIndex];

          return (
          <div key={section.title} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary">
                <SectionIcon size={18} />
              </div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-white/50">{section.title}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {section.items.map((item) => (
                <div key={item.label} className="glass-panel p-5 sm:p-8 flex flex-col sm:flex-row items-start justify-between gap-4 group hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden rounded-2xl border-white/[0.03]">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] rounded-bl-full border-l border-b border-white/[0.03] transition-colors group-hover:bg-primary/5 group-hover:border-primary/20" />
                  <div className="space-y-2 pr-0 sm:pr-4 relative z-10">
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
          );
        })}
      </div>

      <div className="pt-10 sm:pt-12 border-t border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-sm text-white font-bold italic tracking-wide group flex items-center gap-2 cursor-default">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            {text.stableLabel}: <span className="text-primary font-mono not-italic">v2.8.4_AURORA</span>
          </p>
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em] font-bold">SHA-256: 0x82f4...0a91</p>
        </div>
        <button className="w-full sm:w-auto px-6 sm:px-10 py-4 bg-error/10 border border-error/20 text-error text-[10px] font-mono font-bold uppercase tracking-[0.3em] hover:bg-error hover:text-on-error transition-all rounded-2xl shadow-lg hover:shadow-error/30 active:scale-95">
          {text.shutdown}
        </button>
      </div>
    </div>
  );
}
