import { useDeferredValue, useEffect, useState } from 'react';
import { ScrollText, ShieldCheck } from 'lucide-react';
import type { AuditLog, AuditLogEventType, AuditLogFilters } from '../types/audit';
import { useLanguage } from '../i18n';

const EVENT_TYPE_LABELS: Record<AuditLogEventType, string> = {
  login: 'User Login',
  logout: 'User Logout',
  email_confirmed: 'Email Confirmed',
  user_created: 'User Created',
  analysis_field_changed: 'Analysis Step',
  analysis_report_printed: 'Report Printed',
  password_reset_requested: 'Password Reset Requested',
  password_reset_completed: 'Password Reset Completed',
  compound_saved: 'Compound Saved',
  compound_deleted: 'Compound Deleted',
  pdf_exported: 'PDF Exported'
};

const ANALYTICAL_AUDIT_EVENTS = new Set<AuditLogEventType>([
  'analysis_field_changed',
  'analysis_report_printed',
  'user_created',
  'compound_saved'
]);

const AUDIT_TEXT = {
  en: {
    title: 'Analytical Audit Trail',
    oversight: 'Analysis Traceability',
    description: 'Follow the analyst workflow field by field until the final report is printed.',
    scope: 'Controlled Flow',
    scopeDescription: 'This timeline focuses on analytical changes, printed reports, user creation, and saved compound control.',
    eventType: 'Event Type',
    allEvents: 'All events',
    userSearch: 'User Search',
    userSearchPlaceholder: 'Search by full name or user ID...',
    loading: 'Loading audit activity...',
    empty: 'No audit records matched the current filters.',
    loadError: 'Unable to load audit logs right now.',
    generatedAt: 'Generated At',
    who: 'Who',
    action: 'Action',
    target: 'Target',
    details: 'Details',
    noMetadata: 'No additional metadata was captured for this event.',
    systemSession: 'System session',
    eventLabels: EVENT_TYPE_LABELS,
    selectLabels: {
      login: 'Login',
      logout: 'Logout',
      email_confirmed: 'Email confirmed',
      user_created: 'User created',
      analysis_field_changed: 'Analysis step',
      analysis_report_printed: 'Report printed',
      password_reset_requested: 'Password reset requested',
      password_reset_completed: 'Password reset completed',
      compound_saved: 'Compound saved',
      compound_deleted: 'Compound deleted',
      pdf_exported: 'PDF exported'
    }
  },
  pt: {
    title: 'Trilha de Auditoria',
    oversight: 'Supervisão Administrativa',
    description: 'Revise eventos de autenticação, atividades de compostos salvos e exportações de relatórios de espectrofotometria em toda a plataforma.',
    scope: 'Escopo da Auditoria',
    scopeDescription: 'Esta linha do tempo captura quem acessou a plataforma, quem salvou ou excluiu compostos e quem gerou relatórios de espectrofotometria.',
    eventType: 'Tipo de Evento',
    allEvents: 'Todos os eventos',
    userSearch: 'Busca de Usuário',
    userSearchPlaceholder: 'Pesquisar por nome completo ou ID do usuário...',
    loading: 'Carregando atividade de auditoria...',
    empty: 'Nenhum registro de auditoria corresponde aos filtros atuais.',
    loadError: 'Não foi possível carregar a trilha de auditoria agora.',
    generatedAt: 'Gerado em',
    who: 'Quem',
    action: 'Ação',
    target: 'Alvo',
    details: 'Detalhes',
    noMetadata: 'Nenhum metadado adicional foi capturado para este evento.',
    systemSession: 'Sessão do sistema',
    eventLabels: {
      login: 'Login do Usuário',
      logout: 'Logout do Usuário',
      email_confirmed: 'Email Confirmado',
      password_reset_requested: 'Redefinição de Senha Solicitada',
      password_reset_completed: 'Redefinição de Senha Concluída',
      compound_saved: 'Composto Salvo',
      compound_deleted: 'Composto Excluído',
      pdf_exported: 'PDF Exportado'
    },
    selectLabels: {
      login: 'Login',
      logout: 'Logout',
      email_confirmed: 'Email confirmado',
      password_reset_requested: 'Redefinição de senha solicitada',
      password_reset_completed: 'Redefinição de senha concluída',
      compound_saved: 'Composto salvo',
      compound_deleted: 'Composto excluído',
      pdf_exported: 'PDF exportado'
    }
  },
  es: {
    title: 'Registros de Auditoría',
    oversight: 'Supervisión Administrativa',
    description: 'Revisa eventos de autenticación, actividad de compuestos guardados y exportaciones de informes de espectrofotometría en toda la plataforma.',
    scope: 'Alcance de Auditoría',
    scopeDescription: 'Esta línea de tiempo captura quién accedió a la plataforma, quién guardó o eliminó compuestos y quién generó informes de espectrofotometría.',
    eventType: 'Tipo de Evento',
    allEvents: 'Todos los eventos',
    userSearch: 'Búsqueda de Usuario',
    userSearchPlaceholder: 'Buscar por nombre completo o ID de usuario...',
    loading: 'Cargando actividad de auditoría...',
    empty: 'Ningún registro de auditoría coincide con los filtros actuales.',
    loadError: 'No se pueden cargar los registros de auditoría en este momento.',
    generatedAt: 'Generado el',
    who: 'Quién',
    action: 'Acción',
    target: 'Objetivo',
    details: 'Detalles',
    noMetadata: 'No se capturaron metadatos adicionales para este evento.',
    systemSession: 'Sesión del sistema',
    eventLabels: {
      login: 'Inicio de Sesión',
      logout: 'Cierre de Sesión',
      email_confirmed: 'Email Confirmado',
      password_reset_requested: 'Restablecimiento de Contraseña Solicitado',
      password_reset_completed: 'Restablecimiento de Contraseña Completado',
      compound_saved: 'Compuesto Guardado',
      compound_deleted: 'Compuesto Eliminado',
      pdf_exported: 'PDF Exportado'
    },
    selectLabels: {
      login: 'Inicio de sesión',
      logout: 'Cierre de sesión',
      email_confirmed: 'Email confirmado',
      password_reset_requested: 'Restablecimiento solicitado',
      password_reset_completed: 'Restablecimiento completado',
      compound_saved: 'Compuesto guardado',
      compound_deleted: 'Compuesto eliminado',
      pdf_exported: 'PDF exportado'
    }
  }
};

function formatMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  return entries.slice(0, 5);
}

function getAuditTargetLabel(log: AuditLog, fallback: string) {
  const compoundName = typeof log.metadata.compoundName === 'string' ? log.metadata.compoundName : '';

  if (compoundName) {
    return compoundName;
  }

  return log.resourceKey || fallback;
}

function getAuditSentence(log: AuditLog) {
  const actor = log.actor.fullName || log.actor.userId;
  const fieldLabel = typeof log.metadata.fieldLabel === 'string' ? log.metadata.fieldLabel : 'field';
  const previousValue = typeof log.metadata.previousValue === 'string' ? log.metadata.previousValue : '';
  const nextValue = typeof log.metadata.nextValue === 'string' ? log.metadata.nextValue : '';
  const compoundName = typeof log.metadata.compoundName === 'string' ? log.metadata.compoundName : '';
  const createdFullName = typeof log.metadata.createdFullName === 'string' ? log.metadata.createdFullName : '';

  switch (log.eventType) {
    case 'analysis_field_changed':
      if (previousValue && nextValue) {
        return `${actor} alterou ${fieldLabel} de "${previousValue}" para "${nextValue}".`;
      }

      if (previousValue && !nextValue) {
        return `${actor} apagou o valor de ${fieldLabel}, antes "${previousValue}".`;
      }

      return `${actor} preencheu ${fieldLabel} com "${nextValue}".`;
    case 'analysis_report_printed':
    case 'pdf_exported':
      return `${actor} imprimiu o relatorio analitico${compoundName ? ` de ${compoundName}` : ''}.`;
    case 'compound_saved':
      return `${actor} salvou o composto ${compoundName || log.resourceKey || 'sem identificacao'}.`;
    case 'compound_deleted':
      return `${actor} apagou o composto ${compoundName || log.resourceKey || 'sem identificacao'}.`;
    case 'user_created':
      return `${actor} criou o usuario ${createdFullName || log.resourceKey || 'sem identificacao'}.`;
    default:
      return `${actor}: ${log.eventType}.`;
  }
}

interface AuditLogsProps {
  globalSearch?: { query: string; nonce: number };
}

export default function AuditLogs({ globalSearch }: AuditLogsProps) {
  const { language } = useLanguage();
  const text = AUDIT_TEXT[language];
  const [filters, setFilters] = useState<AuditLogFilters>({
    eventType: '',
    userSearch: ''
  });
  const deferredUserSearch = useDeferredValue(filters.userSearch);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!globalSearch) return;
    setFilters((current) => ({ ...current, userSearch: globalSearch.query }));
  }, [globalSearch?.nonce]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAuditLogs() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters.eventType) {
          params.set('eventType', filters.eventType);
        }
        if (deferredUserSearch.trim()) {
          params.set('userSearch', deferredUserSearch.trim());
        }

        const url = params.size > 0 ? `/api/admin/audit-logs?${params.toString()}` : '/api/admin/audit-logs';
        const response = await fetch(url, {
          credentials: 'include',
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { auditLogs: AuditLog[] };
        setLogs(payload.auditLogs);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }

        console.error('Failed to load audit logs:', requestError);
        setError(text.loadError);
      } finally {
        setIsLoading(false);
      }
    }

    void loadAuditLogs();

    return () => controller.abort();
  }, [deferredUserSearch, filters.eventType, text.loadError]);

  const visibleLogs = logs.filter((log) => ANALYTICAL_AUDIT_EVENTS.has(log.eventType));

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">
              {text.oversight}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            {text.title}
          </h1>
          <p className="text-white/40 mt-1 max-w-3xl text-sm leading-relaxed">
            {text.description}
          </p>
        </div>

        <div className="glass-panel px-5 py-4 rounded-2xl border-white/[0.03] w-full xl:max-w-md">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">
            {text.scope}
          </p>
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            {text.scopeDescription}
          </p>
        </div>
      </div>

      <section className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03] space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <label className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.eventType}</span>
            <select
              value={filters.eventType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  eventType: event.target.value as AuditLogFilters['eventType']
                }))
              }
              className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
            >
              <option value="">{text.allEvents}</option>
              <option value="analysis_field_changed">{EVENT_TYPE_LABELS.analysis_field_changed}</option>
              <option value="analysis_report_printed">{EVENT_TYPE_LABELS.analysis_report_printed}</option>
              <option value="user_created">{EVENT_TYPE_LABELS.user_created}</option>
              <option value="compound_saved">{text.selectLabels.compound_saved}</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.userSearch}</span>
            <input
              value={filters.userSearch}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  userSearch: event.target.value
                }))
              }
              placeholder={text.userSearchPlaceholder}
              className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
            />
          </label>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
            {text.loading}
          </div>
        ) : visibleLogs.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
            {text.empty}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleLogs.map((log) => {
              const metadataEntries = formatMetadata(log.metadata);

              return (
                <article
                  key={log.id}
                  className="rounded-2xl p-4 sm:p-5 bg-white/[0.03] border border-white/8 border-l-4 border-l-primary/60 space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                          <ScrollText size={18} />
                        </div>
                        <div>
                          <p className="text-white text-base sm:text-lg font-semibold leading-relaxed">{getAuditSentence(log)}</p>
                          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                            {log.resourceType} {log.resourceKey ? `• ${log.resourceKey}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#08101f]/65 border border-white/8 px-4 py-3 text-right">
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30">{text.generatedAt}</p>
                      <p className="text-white font-semibold mt-2">{new Date(log.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.who}</p>
                      <p className="text-white mt-2 font-semibold">{log.actor.fullName}</p>
                      <p className="text-white/45 mt-2">{log.actor.userId}</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.action}</p>
                      <p className="text-white mt-2 font-semibold">{text.eventLabels[log.eventType] ?? EVENT_TYPE_LABELS[log.eventType]}</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                      <p className="text-white/30 font-mono uppercase tracking-widest">{text.target}</p>
                      <p className="text-white mt-2 font-semibold">{getAuditTargetLabel(log, text.systemSession)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
                        <ShieldCheck size={16} />
                      </div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">{text.details}</p>
                    </div>
                    {metadataEntries.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                        {metadataEntries.map(([key, value]) => (
                          <div key={key} className="rounded-xl bg-[#08101f]/70 border border-white/5 p-3">
                            <p className="text-white/30 font-mono uppercase tracking-widest">{key}</p>
                            <p className="text-white mt-2 break-words">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/45">{text.noMetadata}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
