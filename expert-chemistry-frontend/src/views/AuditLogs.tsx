import { useDeferredValue, useEffect, useState } from 'react';
import { ScrollText, ShieldCheck } from 'lucide-react';
import type { AuditLog, AuditLogEventType, AuditLogFilters } from '../types/audit';

const EVENT_TYPE_LABELS: Record<AuditLogEventType, string> = {
  login: 'User Login',
  logout: 'User Logout',
  compound_saved: 'Compound Saved',
  compound_deleted: 'Compound Deleted',
  pdf_exported: 'PDF Exported'
};

function formatMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  return entries.slice(0, 5);
}

function getAuditTargetLabel(log: AuditLog) {
  const compoundName = typeof log.metadata.compoundName === 'string' ? log.metadata.compoundName : '';

  if (compoundName) {
    return compoundName;
  }

  return log.resourceKey || 'System session';
}

export default function AuditLogs() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    eventType: '',
    userSearch: ''
  });
  const deferredUserSearch = useDeferredValue(filters.userSearch);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError('Unable to load audit logs right now.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadAuditLogs();

    return () => controller.abort();
  }, [deferredUserSearch, filters.eventType]);

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">
              Administrative Oversight
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            Audit Logs
          </h1>
          <p className="text-white/40 mt-1 max-w-3xl text-sm leading-relaxed">
            Review authentication events, saved compound activity, and spectrophotometry report exports across the platform.
          </p>
        </div>

        <div className="glass-panel px-5 py-4 rounded-2xl border-white/[0.03] w-full xl:max-w-md">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-secondary font-bold">
            Audit Scope
          </p>
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            This timeline captures who accessed the platform, who saved or deleted compounds, and who generated spectrophotometry reports.
          </p>
        </div>
      </div>

      <section className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03] space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <label className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">Event Type</span>
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
              <option value="">All events</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="compound_saved">Compound saved</option>
              <option value="compound_deleted">Compound deleted</option>
              <option value="pdf_exported">PDF exported</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">User Search</span>
            <input
              value={filters.userSearch}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  userSearch: event.target.value
                }))
              }
              placeholder="Search by full name or user ID..."
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
            Loading audit activity...
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
            No audit records matched the current filters.
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const metadataEntries = formatMetadata(log.metadata);

              return (
                <article
                  key={log.id}
                  className="rounded-[1.6rem] p-5 sm:p-6 bg-white/[0.03] border border-white/8 space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                          <ScrollText size={18} />
                        </div>
                        <div>
                          <p className="text-white text-lg font-semibold">{EVENT_TYPE_LABELS[log.eventType]}</p>
                          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                            {log.resourceType} {log.resourceKey ? `• ${log.resourceKey}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#08101f]/65 border border-white/8 px-4 py-3 text-right">
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30">Generated At</p>
                      <p className="text-white font-semibold mt-2">{new Date(log.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                      <p className="text-white/30 font-mono uppercase tracking-widest">Who</p>
                      <p className="text-white mt-2 font-semibold">{log.actor.fullName}</p>
                      <p className="text-white/45 mt-2">{log.actor.userId}</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                      <p className="text-white/30 font-mono uppercase tracking-widest">Action</p>
                      <p className="text-white mt-2 font-semibold">{EVENT_TYPE_LABELS[log.eventType]}</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                      <p className="text-white/30 font-mono uppercase tracking-widest">Target</p>
                      <p className="text-white mt-2 font-semibold">{getAuditTargetLabel(log)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
                        <ShieldCheck size={16} />
                      </div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">Details</p>
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
                      <p className="text-sm text-white/45">No additional metadata was captured for this event.</p>
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
