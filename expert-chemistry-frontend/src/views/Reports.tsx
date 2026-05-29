import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, FolderOpen, Search } from 'lucide-react';
import type { ReportExportAuditPayload } from '../types/audit';
import type { AuthUser } from '../types/auth';
import type { StoredReport } from '../types/reports';
import { openPrintableReport } from '../utils/reportExport';

interface ReportsProps {
  currentUser: AuthUser;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 4
  }).format(value);
}

function formatWavelengthMax(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === 'N/A') {
    return 'N/A';
  }

  return /\bnm\b/i.test(trimmed) || /nanometer/i.test(trimmed)
    ? trimmed.replace(/\bnm\b/gi, 'nanometers (nm)')
    : `${trimmed} nanometers (nm)`;
}

function getReportProject(report: StoredReport) {
  if (report.projectId || report.projectName) {
    const label = report.projectName || report.projectId || 'Project';
    return {
      key: report.projectId || label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      label
    };
  }

  const [rawProject] = report.compoundName.split(' - ');
  const label = rawProject?.trim() || report.compoundName || 'Not identified';
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const key = report.casId && report.casId !== 'N/A' ? report.casId : normalizedLabel || label;

  return { key, label };
}

function getReportAnalysis(report: StoredReport) {
  const [, ...analysisParts] = report.compoundName.split(' - ');
  return analysisParts.join(' - ').trim() || report.source || 'Analytical report';
}

export default function Reports({ currentUser }: ReportsProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [selectedProjectKey, setSelectedProjectKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReports() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/reports', {
          credentials: 'include',
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { reports: StoredReport[] };
        setReports(payload.reports);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        console.error('Failed to load reports:', loadError);
        setError('Unable to load saved reports right now.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadReports();

    return () => controller.abort();
  }, []);

  const projectOptions = useMemo(() => {
    const projects = new Map<string, { key: string; label: string; reports: number; lastReportAt: string }>();

    reports.forEach((report) => {
      const project = getReportProject(report);
      const current = projects.get(project.key);

      if (!current) {
        projects.set(project.key, {
          ...project,
          reports: 1,
          lastReportAt: report.createdAt
        });
        return;
      }

      projects.set(project.key, {
        ...current,
        reports: current.reports + 1,
        lastReportAt: new Date(report.createdAt) > new Date(current.lastReportAt)
          ? report.createdAt
          : current.lastReportAt
      });
    });

    return Array.from(projects.values()).sort((left, right) => (
      new Date(right.lastReportAt).getTime() - new Date(left.lastReportAt).getTime()
    ));
  }, [reports]);

  const visibleReports = useMemo(() => {
    if (!selectedProjectKey) return [];

    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return reports.filter((report) => {
      const project = getReportProject(report);
      if (project.key !== selectedProjectKey) return false;
      if (!normalizedQuery) return true;

      return [
        report.reportId,
        report.compoundName,
        report.casId,
        report.source,
        report.generatedByName,
        report.generatedByUserId,
        getReportAnalysis(report)
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [deferredQuery, reports, selectedProjectKey]);

  useEffect(() => {
    if (!selectedProjectKey) return;
    if (!projectOptions.some((project) => project.key === selectedProjectKey)) {
      setSelectedProjectKey('');
    }
  }, [projectOptions, selectedProjectKey]);

  const logReportExport = async (payload: ReportExportAuditPayload) => {
    try {
      const response = await fetch('/api/audit/report-exports', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`Failed to record PDF export audit log: ${response.status}`);
      }
    } catch (auditError) {
      console.warn('Failed to record PDF export audit log:', auditError);
    }
  };

  const exportStoredReport = async (report: StoredReport) => {
    setActiveReportId(report.id);

    try {
      await logReportExport(report);
      openPrintableReport(report);
    } finally {
      setActiveReportId(null);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-secondary uppercase tracking-[0.4em] font-bold">Report History</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">Technical Reports Archive</h1>
          <p className="text-white/40 mt-1 max-w-3xl text-sm leading-relaxed">
            Reopen previously generated spectrophotometry reports without rebuilding the calculation.
            {currentUser.role === 'admin'
              ? ' Administrators can review the complete shared archive.'
              : ' This view is scoped to the reports generated from your account.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] gap-3 w-full xl:w-[720px]">
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-primary transition-colors" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search inside selected project..."
              className="w-full rounded-2xl bg-white/[0.03] border border-white/10 pl-12 pr-4 py-4 text-sm text-white outline-none transition-all focus:border-primary/30 focus:bg-white/[0.06]"
            />
          </div>

          <select
            value={selectedProjectKey}
            onChange={(event) => setSelectedProjectKey(event.target.value)}
            className="w-full rounded-2xl bg-[#101827] border border-white/10 px-4 py-4 text-sm text-white outline-none transition-all focus:border-primary/30 focus:bg-[#131f34]"
          >
            <option value="">Select a project</option>
            {projectOptions.map((project) => (
              <option key={project.key} value={project.key}>
                {project.label} ({project.reports})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isLoading && !error && projectOptions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {projectOptions.map((project) => {
            const isSelected = selectedProjectKey === project.key;

            return (
              <button
                key={project.key}
                type="button"
                onClick={() => setSelectedProjectKey(project.key)}
                className={`text-left rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? 'bg-primary/10 border-primary/40 shadow-[0_0_0_1px_rgba(20,184,166,0.16)]'
                    : 'bg-white/[0.025] border-white/8 hover:bg-white/[0.045] hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-primary/15 text-primary' : 'bg-white/[0.04] text-white/45'}`}>
                    <FolderOpen size={18} />
                  </div>
                  <span className="text-[10px] font-mono text-white/35 uppercase tracking-widest">
                    {project.reports} reports
                  </span>
                </div>
                <p className="mt-4 text-white font-semibold truncate">{project.label}</p>
                <p className="mt-1 text-xs text-white/35">Last result {formatDateTime(project.lastReportAt)}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoading && (
          <div className="xl:col-span-2 glass-panel rounded-2xl p-6 text-sm text-white/55 border-white/10">
            Loading saved reports...
          </div>
        )}

        {!isLoading && error && (
          <div className="xl:col-span-2 rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-100">
            {error}
          </div>
        )}

        {!isLoading && !error && reports.length === 0 && (
          <div className="xl:col-span-2 glass-panel rounded-2xl p-6 text-sm text-white/55 border-white/10">
            No completed project reports found yet.
          </div>
        )}

        {!isLoading && !error && reports.length > 0 && !selectedProjectKey && (
          <div className="xl:col-span-2 glass-panel rounded-2xl p-6 text-sm text-white/55 border-white/10">
            Select a project above to open its generated results.
          </div>
        )}

        {!isLoading && !error && selectedProjectKey && visibleReports.length === 0 && (
          <div className="xl:col-span-2 glass-panel rounded-2xl p-6 text-sm text-white/55 border-white/10">
            No reports found inside this project for the current search.
          </div>
        )}

        {!isLoading && !error && visibleReports.map((report) => {
          const isActive = activeReportId === report.id;
          const project = getReportProject(report);
          const analysis = getReportAnalysis(report);

          return (
            <div
              key={report.id}
              className="glass-panel p-5 sm:p-7 flex flex-col justify-between group hover:border-primary/20 transition-all rounded-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />

              <div className="space-y-6 relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-secondary group-hover:bg-secondary/10 transition-all">
                    <FileText size={24} />
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => {
                        void exportStoredReport(report);
                      }}
                      disabled={isActive}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-white/40 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Print PDF report"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => {
                        void exportStoredReport(report);
                      }}
                      disabled={isActive}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-white/40 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Open report preview"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-display font-bold text-white group-hover:text-primary transition-colors leading-tight">
                      {project.label}
                    </h3>
                    <span className="text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border text-green-400 bg-green-400/5 border-green-400/20">
                      Saved Snapshot
                    </span>
                  </div>
                  <p className="text-white/55 mt-2 text-sm font-semibold">{analysis}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                    <span className="text-white/45">CAS {report.casId}</span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-primary font-mono uppercase tracking-[0.18em] font-bold">{report.reportId}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">Generated by</p>
                    <p className="text-white mt-2 font-semibold">{report.generatedByName}</p>
                    <p className="text-white/45 text-xs mt-1">@{report.generatedByUserId}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">Generated at</p>
                    <p className="text-white mt-2 font-semibold">{formatDateTime(report.generatedAt)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                    <p className="text-white/30 font-mono uppercase tracking-widest">Absorbance</p>
                    <p className="text-white mt-2 font-semibold">{formatNumber(report.absorbance)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4 sm:col-span-2">
                    <p className="text-white/30 font-mono uppercase tracking-widest">Lambda max</p>
                    <p className="text-white mt-2 font-semibold leading-relaxed break-words">{formatWavelengthMax(report.lambdaMax)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4 sm:col-span-2">
                    <p className="text-white/30 font-mono uppercase tracking-widest">Solvent</p>
                    <p className="text-white mt-2 font-semibold leading-relaxed break-words">{report.solvent || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-7 pt-5 border-t border-white/[0.05] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
                <div className="text-xs text-white/45 leading-relaxed">
                  Source {report.source} - Path length {formatNumber(report.pathLengthValue)} cm - Concentration {formatNumber(report.concentrationValue)} mol/L
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/35">
                  Stored {formatDateTime(report.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
