import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  BookMarked,
  FlaskConical,
  ShieldCheck,
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
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
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
    { label: 'Spectral Records', value: formatNumber(summary.stats.spectralRecords), icon: Waves, color: 'text-secondary', detail: 'Analytical source dataset' },
    { label: 'Registered Users', value: formatNumber(summary.stats.registeredUsers), icon: Users, color: 'text-blue-400', detail: 'Platform accounts' },
    { label: 'Administrators', value: formatNumber(summary.stats.adminUsers), icon: ShieldCheck, color: 'text-green-400', detail: 'Privileged accounts' }
  ] : [];

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
