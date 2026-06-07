import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookMarked,
  FlaskConical,
  FolderOpen,
  Gauge,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRoundPlus,
  Users,
  Waves
} from 'lucide-react';
import type { View } from '../constants';
import type { AuthUser } from '../types/auth';

interface DashboardProps {
  currentUser: AuthUser;
  onOpenView: (view: View, options?: { spectrophotometryTab?: 'calculate' | 'saved'; reportsProjectKey?: string; reportsProjectLabel?: string }) => void;
}

interface DashboardSummary {
  stats: {
    savedCompounds: number;
    spectralRecords: number;
    registeredUsers: number;
    adminUsers: number;
    generatedReports: number;
    currentRole: 'admin' | 'user';
  };
  savedCompoundsPreview: Array<{
    cas: string;
    nome: string;
    epsilon_m_cm: number | null;
    lambda_max: string;
    fonte: string;
  }>;
  recentUsers: Array<{
    id: number;
    userId: string;
    fullName: string;
    createdAt: string;
    role: 'admin' | 'user';
  }>;
  recentReports: Array<{
    id: number;
    reportId: string;
    projectId?: string;
    projectName?: string;
    compoundName: string;
    casId?: string;
    source: string;
    absorbance: number;
    concentrationValue: number;
    generatedAt: string;
    createdAt: string;
    generatedByName: string;
    generatedByUserId: string;
  }>;
  resultTrend: Array<{
    period: string;
    reports: number;
    avgAbsorbance: number;
    avgConcentration: number;
  }>;
  userResultBreakdown: Array<{
    userId: string;
    fullName: string;
    reports: number;
    avgAbsorbance: number;
    avgConcentration: number;
    lastGeneratedAt: string;
  }>;
  sourceBreakdown: Array<{
    source: string;
    reports: number;
    avgAbsorbance: number;
  }>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
    minimumFractionDigits: 2
  }).format(value);
}

function formatDateShort(value: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function formatDateTime(value: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getMax(values: number[]) {
  return Math.max(1, ...values.filter((value) => Number.isFinite(value)));
}

function getMin(values: number[]) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  return finiteValues.length ? Math.min(...finiteValues) : 0;
}

function getReportIdentity(report: DashboardSummary['recentReports'][number]) {
  if (report.projectName || report.projectId) {
    const [, ...rawAnalysisParts] = report.compoundName.split(' - ');
    return {
      compound: report.projectName || report.projectId || 'Project',
      analysis: rawAnalysisParts.join(' - ').trim() || report.compoundName || report.source || 'Analytical report'
    };
  }

  const [rawCompound, ...rawAnalysisParts] = report.compoundName.split(' - ');
  const compound = rawCompound?.trim() || report.compoundName || 'Not identified';
  const analysis = rawAnalysisParts.join(' - ').trim() || report.source || 'Analytical report';

  return {
    compound,
    analysis
  };
}

function getReportProjectKey(report: DashboardSummary['recentReports'][number]) {
  const identity = getReportIdentity(report);
  const normalizedProject = identity.compound.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return report.projectId || (report.casId && report.casId !== 'N/A' ? report.casId : normalizedProject || identity.compound);
}

function getReportsViewProjectKey(report: DashboardSummary['recentReports'][number]) {
  if (report.projectId || report.projectName) {
    const label = report.projectName || report.projectId || 'Project';
    return report.projectId || label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  const [rawProject] = report.compoundName.split(' - ');
  const label = rawProject?.trim() || report.compoundName || 'Not identified';

  return report.casId && report.casId !== 'N/A'
    ? report.casId
    : label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || label;
}

export default function Dashboard({ currentUser, onOpenView }: DashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState('all');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/dashboard', {
          credentials: 'include',
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as DashboardSummary;
        setSummary(payload);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }

        console.error('Failed to load dashboard summary:', requestError);
        setError('Unable to load dashboard data right now.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, []);

  const stats = summary ? [
    { label: 'Saved Compounds', value: formatNumber(summary.stats.savedCompounds), icon: FlaskConical, color: 'text-primary', detail: 'Stored results library', onClick: () => onOpenView('spectrophotometry', { spectrophotometryTab: 'saved' }) },
    { label: 'Generated Reports', value: formatNumber(summary.stats.generatedReports ?? 0), icon: BarChart3, color: 'text-secondary', detail: 'Decision records', onClick: () => onOpenView('reports') },
    { label: 'Registered Users', value: formatNumber(summary.stats.registeredUsers), icon: Users, color: 'text-blue-400', detail: 'Platform accounts', onClick: () => onOpenView('user-management') },
    { label: 'Spectral Records', value: formatNumber(summary.stats.spectralRecords), icon: Waves, color: 'text-green-400', detail: 'Analytical source dataset', onClick: () => onOpenView('spectrophotometry') }
  ] : [];
  const recentReports = summary?.recentReports ?? [];
  const userResultBreakdown = summary?.userResultBreakdown ?? [];
  const sourceBreakdown = summary?.sourceBreakdown ?? [];
  const maxUserReports = getMax(userResultBreakdown.map((user) => user.reports));
  const maxSourceReports = getMax(sourceBreakdown.map((source) => source.reports));
  const projectGroups = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      name: string;
      reportsProjectKey: string;
      reports: DashboardSummary['recentReports'];
      avgAbsorbance: number;
      latestAt: string;
    }>();

    recentReports.forEach((report) => {
      const key = getReportProjectKey(report);
      const identity = getReportIdentity(report);
      const current = groups.get(key);
      const nextReports = current ? [...current.reports, report] : [report];
      const latestAt = current && new Date(current.latestAt) > new Date(report.createdAt)
        ? current.latestAt
        : report.createdAt;

      groups.set(key, {
        key,
        name: identity.compound,
        reportsProjectKey: getReportsViewProjectKey(report),
        reports: nextReports,
        avgAbsorbance: nextReports.reduce((sum, item) => sum + item.absorbance, 0) / nextReports.length,
        latestAt
      });
    });

    return Array.from(groups.values()).sort((left, right) => (
      new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime()
    ));
  }, [recentReports]);
  const filteredRecentReports = selectedProjectKey === 'all'
    ? recentReports
    : recentReports.filter((report) => getReportProjectKey(report) === selectedProjectKey);
  const normalizedProjectSearch = projectSearchQuery.trim().toLowerCase();
  const visibleProjectGroups = normalizedProjectSearch
    ? projectGroups.filter((project) => project.name.toLowerCase().includes(normalizedProjectSearch))
    : projectGroups;
  const selectedProjectGroup = selectedProjectKey === 'all'
    ? null
    : projectGroups.find((project) => project.key === selectedProjectKey) ?? null;
  const latestReport = filteredRecentReports[0] ?? null;
  const latestReportIdentity = latestReport ? getReportIdentity(latestReport) : null;
  const recentReportsChronological = [...filteredRecentReports].reverse();
  const recentAbsorbanceValues = recentReportsChronological.map((report) => report.absorbance);
  const minRecentAbsorbance = getMin(recentAbsorbanceValues);
  const maxRecentAbsorbance = getMax(recentAbsorbanceValues);
  const avgRecentAbsorbance = filteredRecentReports.length
    ? filteredRecentReports.reduce((sum, report) => sum + report.absorbance, 0) / filteredRecentReports.length
    : 0;
  const highestRecentReport = filteredRecentReports.reduce<typeof latestReport>((highest, report) => {
    if (!highest || report.absorbance > highest.absorbance) return report;
    return highest;
  }, null) ?? null;

  useEffect(() => {
    if (selectedProjectKey === 'all') return;
    if (!projectGroups.some((project) => project.key === selectedProjectKey)) {
      setSelectedProjectKey('all');
    }
  }, [projectGroups, selectedProjectKey]);

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_10px_rgba(118,243,234,0.5)]" />
          <span className="text-[10px] font-mono text-secondary uppercase tracking-[0.4em] font-bold">System Overview</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">Executive Dashboard</h1>
        <p className="text-white/40 mt-1 max-w-3xl text-sm leading-relaxed">
          Welcome back, <span className="text-white/80">{currentUser.fullName}</span>. Monitor platform usage, saved chemistry records, and operational access from one place.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="glass-panel rounded-[2rem] p-8 text-sm text-white/55">
          Loading dashboard data...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.button
                key={stat.label}
                type="button"
                onClick={stat.onClick}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`glass-panel glass-panel-hover p-6 group rounded-2xl text-left ${stat.onClick ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 rounded-xl bg-white/[0.03] border border-white/5 transition-all group-hover:scale-110 group-hover:border-white/10 ${stat.color}`}>
                    <stat.icon size={22} />
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1 block">Live Metric</span>
                    <span className="text-[10px] font-mono text-secondary">{stat.detail}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-white/40 text-xs font-mono uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-white group-hover:glow-text transition-all">{stat.value}</p>
                </div>
              </motion.button>
            ))}
          </div>

          <section className="space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-display font-bold text-white tracking-tight">Results Intelligence</h2>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold border border-primary/20">CALIBRATION BI</span>
                </div>
                <p className="text-sm text-white/40 mt-2 max-w-3xl leading-relaxed">
                  Recent analytical outputs, responsible users, and comparative signals for faster operational decisions.
                </p>
              </div>
            </div>

            {projectGroups.length > 0 && (
              <div className="space-y-3">
                <div className="relative max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                  <input
                    type="search"
                    value={projectSearchQuery}
                    onChange={(event) => setProjectSearchQuery(event.target.value)}
                    placeholder="Search folders"
                    className="w-full rounded-xl border border-white/8 bg-white/[0.025] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:border-primary/40 focus:bg-white/[0.04]"
                  />
                </div>

                <div className="grid grid-flow-col auto-cols-[minmax(220px,260px)] sm:auto-cols-[minmax(240px,280px)] gap-4 overflow-x-auto overflow-y-hidden custom-scrollbar pb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProjectKey('all')}
                    className={`text-left rounded-2xl border p-4 transition-all ${
                      selectedProjectKey === 'all'
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-white/[0.025] border-white/8 hover:bg-white/[0.045] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className={`p-2.5 rounded-xl ${selectedProjectKey === 'all' ? 'bg-primary/15 text-primary' : 'bg-white/[0.04] text-white/45'}`}>
                        <FolderOpen size={18} />
                      </div>
                      <span className="text-[10px] font-mono text-white/35 uppercase tracking-widest">{recentReports.length} reports</span>
                    </div>
                    <p className="mt-4 text-white font-semibold truncate">All projects</p>
                    <p className="mt-1 text-xs text-white/35">Combined recent results</p>
                  </button>

                  {visibleProjectGroups.map((project) => {
                    const isSelected = selectedProjectKey === project.key;

                    return (
                      <button
                        key={project.key}
                        type="button"
                        onClick={() => setSelectedProjectKey(project.key)}
                        className={`text-left rounded-2xl border p-4 transition-all ${
                          isSelected
                            ? 'bg-secondary/10 border-secondary/40'
                            : 'bg-white/[0.025] border-white/8 hover:bg-white/[0.045] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-secondary/15 text-secondary' : 'bg-white/[0.04] text-white/45'}`}>
                            <FolderOpen size={18} />
                          </div>
                          <span className="text-[10px] font-mono text-white/35 uppercase tracking-widest">{project.reports.length} reports</span>
                        </div>
                        <p className="mt-4 text-white font-semibold truncate">{project.name}</p>
                        <p className="mt-1 text-xs text-white/35">Avg A {formatDecimal(project.avgAbsorbance)} - {formatDateShort(project.latestAt)}</p>
                      </button>
                    );
                  })}
                </div>

                {!visibleProjectGroups.length && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/35">
                    No folders match this search.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
              <div className="glass-panel rounded-2xl p-4 sm:p-5 border-white/[0.03]">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-primary font-bold">Analytical Trend</p>
                    <h3 className="text-white font-display font-bold mt-2">Recent completed results by project</h3>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                    Click Open Reports to inspect each record
                  </span>
                </div>

                {recentReportsChronological.length ? (
                  <div className="rounded-2xl bg-[#08101f]/55 border border-white/5 p-3 sm:p-4 overflow-hidden">
                    {(() => {
                      const width = 720;
                      const height = 240;
                      const padding = { top: 22, right: 24, bottom: 54, left: 58 };
                      const plotWidth = width - padding.left - padding.right;
                      const plotHeight = height - padding.top - padding.bottom;
                      const valueRange = maxRecentAbsorbance - minRecentAbsorbance || 1;
                      const pointCount = Math.max(1, recentReportsChronological.length - 1);
                      const scaleX = (index: number) => padding.left + (index / pointCount) * plotWidth;
                      const scaleY = (value: number) => padding.top + plotHeight - ((value - minRecentAbsorbance) / valueRange) * plotHeight;
                      const points = recentReportsChronological.map((report, index) => ({
                        report,
                        x: scaleX(index),
                        y: scaleY(report.absorbance),
                        identity: getReportIdentity(report)
                      }));
                      const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');

                      return (
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[230px] sm:h-[260px] xl:h-[280px]">
                          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="rgba(255,255,255,0.12)" />
                          <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="rgba(255,255,255,0.12)" />
                          {[0, 0.5, 1].map((ratio) => {
                            const y = padding.top + plotHeight * ratio;
                            const value = maxRecentAbsorbance - valueRange * ratio;
                            return (
                              <g key={ratio}>
                                <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke="rgba(255,255,255,0.045)" />
                                <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.38)">
                                  {formatDecimal(value)}
                                </text>
                              </g>
                            );
                          })}
                          {points.length > 1 && (
                            <polyline points={polyline} fill="none" stroke="#76f3ea" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          )}
                          {points.map((point, index) => (
                            <g key={point.report.reportId}>
                              <circle cx={point.x} cy={point.y} r="8" fill="rgba(118,243,234,0.16)" />
                              <circle cx={point.x} cy={point.y} r="5.5" fill="#76f3ea" stroke="#e9fffd" strokeWidth="1.6" filter="drop-shadow(0 0 8px rgba(118,243,234,0.85))" />
                              <text x={point.x} y={point.y - 12} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.68)">
                                {index + 1}
                              </text>
                              <text x={point.x} y={height - 24} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.38)">
                                {formatDateShort(point.report.createdAt)}
                              </text>
                            </g>
                          ))}
                          <text x={padding.left + plotWidth / 2} y={height - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.48)">
                            Completed report sequence
                          </text>
                          <text x="10" y={padding.top + plotHeight / 2} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.48)" transform={`rotate(-90 10 ${padding.top + plotHeight / 2})`}>
                            Absorbance (AU)
                          </text>
                        </svg>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="h-[260px] rounded-2xl bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center text-sm text-white/35">
                    Completed reports will appear here as soon as an analysis is finalized.
                  </div>
                )}
              </div>

              <div className="glass-panel rounded-2xl p-4 border-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
                    <Gauge size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/30">Latest Analysis</p>
                    <p className="text-white font-semibold mt-1">Most recent completed report</p>
                  </div>
                </div>

                {latestReport && latestReportIdentity ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/30">Compound</p>
                      <p className="text-xl font-display font-bold text-white mt-1 break-words">{latestReportIdentity.compound}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-primary/80">Analysis / method</p>
                      <p className="text-white font-semibold mt-1 break-words">{latestReportIdentity.analysis}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-2.5">
                        <p className="text-white/30 font-mono uppercase tracking-widest text-[10px]">Absorbance</p>
                        <p className="text-white font-semibold mt-1">{formatDecimal(latestReport.absorbance)}</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-2.5">
                        <p className="text-white/30 font-mono uppercase tracking-widest text-[10px]">Concentration</p>
                        <p className="text-white font-semibold mt-1">{formatDecimal(latestReport.concentrationValue)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenView('reports', selectedProjectGroup ? { reportsProjectKey: selectedProjectGroup.reportsProjectKey, reportsProjectLabel: selectedProjectGroup.name } : undefined)}
                      className="w-full rounded-xl bg-primary text-on-primary px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:shadow-[0_0_26px_rgba(167,200,255,0.22)] transition-all flex items-center justify-center gap-2"
                    >
                      Open Reports
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-white/35">No completed analytical report yet.</p>
                )}
              </div>
            </div>

            <div className="hidden">
                <div className="hidden">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
                      <Gauge size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/30">Decision Signal</p>
                      <p className="text-white font-semibold mt-1">Highest selected response</p>
                    </div>
                  </div>
                  <p className="text-3xl font-display font-bold text-white mt-5">
                    {highestRecentReport ? formatDecimal(highestRecentReport.absorbance) : '---'}
                    <span className="text-sm font-mono text-white/40 ml-2">AU</span>
                  </p>
                  <p className="text-sm text-white/45 mt-2 truncate">
                    {highestRecentReport ? `${getReportIdentity(highestRecentReport).compound} · ${getReportIdentity(highestRecentReport).analysis}` : 'No recent reports available.'}
                  </p>
                </div>

                <div className="glass-panel rounded-2xl p-5 border-white/[0.03]">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2">
                      <p className="text-white/30 font-mono uppercase tracking-widest">Selected Avg A</p>
                      <p className="text-white font-semibold mt-1">{formatDecimal(avgRecentAbsorbance)}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2">
                      <p className="text-white/30 font-mono uppercase tracking-widest">Latest User</p>
                      <p className="text-white font-semibold mt-1 truncate">{latestReport?.generatedByUserId ?? 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-5 border-white/[0.03]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/30">Method Sources</p>
                      <p className="text-white font-semibold mt-1">Report origin comparison</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {sourceBreakdown.length ? sourceBreakdown.map((source) => (
                      <div key={source.source} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-white/70 truncate">{source.source}</span>
                          <span className="font-mono text-white/40">{source.reports} reports</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                          <div className="h-full rounded-full bg-secondary/80" style={{ width: `${Math.max(6, (source.reports / maxSourceReports) * 100)}%` }} />
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-white/35">No report sources yet.</p>
                    )}
                  </div>
                </div>
              </div>

            <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
                    <Gauge size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/30">Decision Signal</p>
                    <p className="text-white font-semibold mt-1">Highest selected response</p>
                  </div>
                </div>

                <p className="text-4xl font-display font-bold text-white mt-6">
                  {highestRecentReport ? formatDecimal(highestRecentReport.absorbance) : '---'}
                  <span className="text-sm font-mono text-white/40 ml-2">AU</span>
                </p>
                <p className="text-sm text-white/45 mt-2 break-words">
                  {highestRecentReport ? `${getReportIdentity(highestRecentReport).compound} - ${getReportIdentity(highestRecentReport).analysis}` : 'No recent reports available.'}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-3">
                    <p className="text-white/30 font-mono uppercase tracking-widest">Selected Avg A</p>
                    <p className="text-white font-semibold mt-1">{formatDecimal(avgRecentAbsorbance)}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-3">
                    <p className="text-white/30 font-mono uppercase tracking-widest">Latest User</p>
                    <p className="text-white font-semibold mt-1 truncate">{latestReport?.generatedByUserId ?? 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-2xl border-white/[0.03] overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-secondary font-bold">Recent Results</p>
                    <h3 className="text-white font-display font-bold mt-2">Latest generated reports</h3>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                    {selectedProjectKey === 'all' ? (currentUser.role === 'admin' ? 'All users' : 'Your account') : 'Selected project'}
                  </span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {filteredRecentReports.length ? filteredRecentReports.map((report) => (
                    <div key={report.id} className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_170px_130px] gap-4 hover:bg-white/[0.02] transition-all">
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{getReportIdentity(report).compound}</p>
                        <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest mt-2">
                          {getReportIdentity(report).analysis}
                        </p>
                        <p className="text-[10px] text-white/25 font-mono uppercase tracking-widest mt-1 truncate">{report.reportId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Generated by</p>
                        <p className="text-white/75 text-sm mt-1 truncate">{report.generatedByName}</p>
                        <p className="text-white/35 text-[10px] font-mono mt-1">@{report.generatedByUserId}</p>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 text-xs">
                        <div>
                          <p className="text-white/30 font-mono uppercase tracking-widest">A / c</p>
                          <p className="text-white font-semibold mt-1">{formatDecimal(report.absorbance)} / {formatDecimal(report.concentrationValue)}</p>
                        </div>
                        <div>
                          <p className="text-white/30 font-mono uppercase tracking-widest">Time</p>
                          <p className="text-white/55 mt-1">{formatDateTime(report.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-6 text-sm text-white/35">No recent reports available yet.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:gap-8">
            <section className="hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-display font-bold text-white tracking-tight">Saved Library Snapshot</h2>
                  <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[10px] font-mono font-bold border border-secondary/20">COMPOUNDS</span>
                </div>
                <button
                  onClick={() => onOpenView('spectrophotometry', { spectrophotometryTab: 'saved' })}
                  className="inline-flex items-center gap-2 text-[10px] font-mono text-white/30 hover:text-primary transition-all uppercase tracking-[0.2em] hover:bg-white/5 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/5"
                >
                  Open Workflow
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="glass-panel overflow-hidden border-white/[0.03] rounded-2xl">
                <div className="divide-y divide-white/[0.03]">
                  {summary?.savedCompoundsPreview.length ? summary.savedCompoundsPreview.map((compound) => (
                    <div key={compound.cas} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-all">
                      <div className="min-w-0">
                        <p className="text-white font-semibold break-words">{compound.nome}</p>
                        <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest mt-2">
                          CAS {compound.cas} · SOURCE {compound.fonte}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs min-w-[220px]">
                        <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-3">
                          <p className="text-white/30 font-mono uppercase tracking-widest">Epsilon</p>
                          <p className="text-white mt-1 font-semibold">{compound.epsilon_m_cm ?? 'N/A'}</p>
                        </div>
                        <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-3">
                          <p className="text-white/30 font-mono uppercase tracking-widest">Lambda Max</p>
                          <p className="text-white mt-1 font-semibold">{compound.lambda_max}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-6 text-sm text-white/55">No saved compounds available yet.</div>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Operational Actions</h2>
              <div className="glass-panel p-6 sm:p-8 space-y-5 border-white/[0.03] rounded-2xl">
                <button
                  onClick={() => onOpenView('spectrophotometry')}
                  className="w-full rounded-2xl border border-primary/20 bg-primary/10 p-5 text-left hover:bg-primary/15 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/20 text-primary border border-primary/20">
                      <Activity size={20} />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Open Spectrophotometry Workflow</p>
                      <p className="text-sm text-white/50 mt-1">Run calculations, search spectral data, and save results.</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => onOpenView('upload')}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
                      <BookMarked size={20} />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Review Data Intake</p>
                      <p className="text-sm text-white/50 mt-1">Prepare imports and inspect incoming laboratory files.</p>
                    </div>
                  </div>
                </button>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => onOpenView('user-management')}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left hover:bg-white/[0.05] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-300 border border-blue-400/20">
                        <UserRoundPlus size={20} />
                      </div>
                      <div>
                        <p className="text-white font-semibold">Manage Platform Access</p>
                        <p className="text-sm text-white/50 mt-1">Create users, review roles, and control administrator privileges.</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {currentUser.role === 'admin' && (
                <div className="hidden">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-green-500/10 text-green-300 border border-green-400/20">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Recent User Registrations</p>
                      <p className="text-sm text-white/50 mt-1">Newest accounts provisioned in the platform.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {summary?.recentUsers.length ? summary.recentUsers.map((user) => (
                      <div key={user.id} className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
                        <p className="text-white font-medium">{user.fullName}</p>
                        <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest mt-2">
                          {user.userId} · {user.role} · {new Date(user.createdAt).toLocaleString()}
                        </p>
                      </div>
                    )) : (
                      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 text-sm text-white/55">
                        No recent user records available.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
