import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookMarked,
  FlaskConical,
  Gauge,
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
  onOpenView: (view: View) => void;
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
    compoundName: string;
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

export default function Dashboard({ currentUser, onOpenView }: DashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
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
    { label: 'Saved Compounds', value: formatNumber(summary.stats.savedCompounds), icon: FlaskConical, color: 'text-primary', detail: 'Stored results library' },
    { label: 'Generated Reports', value: formatNumber(summary.stats.generatedReports ?? 0), icon: BarChart3, color: 'text-secondary', detail: 'Decision records' },
    { label: 'Registered Users', value: formatNumber(summary.stats.registeredUsers), icon: Users, color: 'text-blue-400', detail: 'Platform accounts' },
    { label: 'Spectral Records', value: formatNumber(summary.stats.spectralRecords), icon: Waves, color: 'text-green-400', detail: 'Analytical source dataset' }
  ] : [];
  const resultTrend = summary?.resultTrend ?? [];
  const recentReports = summary?.recentReports ?? [];
  const userResultBreakdown = summary?.userResultBreakdown ?? [];
  const sourceBreakdown = summary?.sourceBreakdown ?? [];
  const maxTrendReports = getMax(resultTrend.map((point) => point.reports));
  const maxUserReports = getMax(userResultBreakdown.map((user) => user.reports));
  const maxSourceReports = getMax(sourceBreakdown.map((source) => source.reports));
  const latestReport = recentReports[0] ?? null;
  const avgRecentAbsorbance = recentReports.length
    ? recentReports.reduce((sum, report) => sum + report.absorbance, 0) / recentReports.length
    : 0;
  const highestRecentReport = recentReports.reduce<typeof latestReport>((highest, report) => {
    if (!highest || report.absorbance > highest.absorbance) return report;
    return highest;
  }, null) ?? null;

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
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="glass-panel glass-panel-hover p-6 group rounded-2xl"
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
              </motion.div>
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
              <button
                onClick={() => onOpenView('reports')}
                className="inline-flex items-center justify-center gap-2 text-[10px] font-mono text-white/35 hover:text-primary transition-all uppercase tracking-[0.2em] hover:bg-white/5 px-3 py-2 rounded-lg border border-white/8"
              >
                Open Reports
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border-white/[0.03]">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-secondary font-bold">Results Over Time</p>
                    <h3 className="text-white font-display font-bold mt-2">Daily report volume and response intensity</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2">
                      <p className="text-white/30 font-mono uppercase tracking-widest">Recent Avg A</p>
                      <p className="text-white font-semibold mt-1">{formatDecimal(avgRecentAbsorbance)}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2">
                      <p className="text-white/30 font-mono uppercase tracking-widest">Latest User</p>
                      <p className="text-white font-semibold mt-1 truncate max-w-[140px]">{latestReport?.generatedByUserId ?? 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {resultTrend.length ? (
                  <div className="h-[260px] rounded-2xl bg-[#08101f]/55 border border-white/5 p-4 overflow-hidden">
                    <div className="h-full flex items-end gap-2">
                      {resultTrend.map((point) => {
                        const barHeight = Math.max(10, (point.reports / maxTrendReports) * 100);
                        const responseHeight = Math.max(6, Math.min(100, (point.avgAbsorbance / Math.max(1, avgRecentAbsorbance || point.avgAbsorbance)) * 50));

                        return (
                          <div key={point.period} className="flex-1 h-full flex flex-col items-center justify-end gap-2 min-w-0">
                            <div className="relative w-full h-[190px] flex items-end justify-center rounded-lg bg-white/[0.015] border border-white/[0.03] overflow-hidden">
                              <div
                                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[58%] rounded-t-md bg-primary/70 shadow-[0_0_18px_rgba(167,200,255,0.22)]"
                                style={{ height: `${barHeight}%` }}
                                title={`${point.reports} reports`}
                              />
                              <div
                                className="absolute bottom-0 right-[14%] w-[12%] rounded-t-md bg-secondary/80"
                                style={{ height: `${responseHeight}%` }}
                                title={`Avg absorbance ${formatDecimal(point.avgAbsorbance)}`}
                              />
                              <span className="absolute top-2 text-[10px] font-mono text-white/45">{point.reports}</span>
                            </div>
                            <span className="text-[10px] text-white/35 font-mono truncate">{formatDateShort(point.period)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-[260px] rounded-2xl bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center text-sm text-white/35">
                    Generate reports to populate trend analytics.
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-mono uppercase tracking-widest text-white/35">
                  <span className="inline-flex items-center gap-2"><span className="h-2 w-4 rounded bg-primary/70" /> Report count</span>
                  <span className="inline-flex items-center gap-2"><span className="h-2 w-4 rounded bg-secondary/80" /> Avg absorbance</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="glass-panel rounded-2xl p-5 border-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
                      <Gauge size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/30">Decision Signal</p>
                      <p className="text-white font-semibold mt-1">Highest recent analytical response</p>
                    </div>
                  </div>
                  <p className="text-3xl font-display font-bold text-white mt-5">
                    {highestRecentReport ? formatDecimal(highestRecentReport.absorbance) : '---'}
                    <span className="text-sm font-mono text-white/40 ml-2">AU</span>
                  </p>
                  <p className="text-sm text-white/45 mt-2 truncate">
                    {highestRecentReport ? `${highestRecentReport.compoundName} by ${highestRecentReport.generatedByUserId}` : 'No recent reports available.'}
                  </p>
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
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border-white/[0.03]">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-primary font-bold">User Contribution</p>
                    <h3 className="text-white font-display font-bold mt-2">Results by analyst</h3>
                  </div>
                  <Users size={20} className="text-white/25" />
                </div>
                <div className="space-y-4">
                  {userResultBreakdown.length ? userResultBreakdown.map((user) => (
                    <div key={user.userId} className="rounded-xl bg-white/[0.025] border border-white/8 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{user.fullName}</p>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mt-1">@{user.userId}</p>
                        </div>
                        <span className="text-sm font-mono text-primary">{user.reports}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-full bg-primary/75" style={{ width: `${Math.max(8, (user.reports / maxUserReports) * 100)}%` }} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono text-white/35">
                        <span>Avg A {formatDecimal(user.avgAbsorbance)}</span>
                        <span className="text-right">Last {formatDateShort(user.lastGeneratedAt)}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-xl bg-white/[0.02] border border-dashed border-white/10 p-6 text-sm text-white/35">
                      No generated report activity yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-panel rounded-2xl border-white/[0.03] overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-secondary font-bold">Recent Results</p>
                    <h3 className="text-white font-display font-bold mt-2">Latest generated reports</h3>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                    {currentUser.role === 'admin' ? 'All users' : 'Your account'}
                  </span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {recentReports.length ? recentReports.map((report) => (
                    <div key={report.id} className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_170px_130px] gap-4 hover:bg-white/[0.02] transition-all">
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{report.compoundName}</p>
                        <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest mt-2">
                          {report.reportId} · {report.source}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Generated by</p>
                        <p className="text-white/75 text-sm mt-1 truncate">{report.generatedByName}</p>
                        <p className="text-white/35 text-[10px] font-mono mt-1">@{report.generatedByUserId}</p>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 text-xs">
                        <div>
                          <p className="text-white/30 font-mono uppercase tracking-widest">A</p>
                          <p className="text-white font-semibold mt-1">{formatDecimal(report.absorbance)}</p>
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

          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-8">
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-display font-bold text-white tracking-tight">Saved Library Snapshot</h2>
                  <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[10px] font-mono font-bold border border-secondary/20">COMPOUNDS</span>
                </div>
                <button
                  onClick={() => onOpenView('spectrophotometry')}
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
                <div className="glass-panel p-6 sm:p-8 space-y-4 border-white/[0.03] rounded-2xl">
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
