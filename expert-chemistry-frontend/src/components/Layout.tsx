import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  HelpCircle, 
  Languages,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { NAV_ITEMS, OTHER_ITEMS, View } from '../constants';
import { LANGUAGE_OPTIONS, useLanguage } from '../i18n';
import type { UserRole } from '../types/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  contentKey: string;
  onViewChange: (view: View) => void;
  onGlobalSearch: (query: string) => void;
  onLogout: () => void;
  user: {
    name: string;
    role: string;
    userRole: UserRole;
    avatar?: string;
  };
}

const FAQ_ITEMS = [
  {
    questionKey: 'faq.reports.question',
    answerKey: 'faq.reports.answer'
  },
  {
    questionKey: 'faq.result.question',
    answerKey: 'faq.result.answer'
  },
  {
    questionKey: 'faq.search.question',
    answerKey: 'faq.search.answer'
  },
  {
    questionKey: 'faq.pdf.question',
    answerKey: 'faq.pdf.answer'
  }
] as const;

function getNavLabelKey(view: View) {
  switch (view) {
    case 'dashboard': return 'nav.dashboard';
    case 'spectrophotometry': return 'nav.spectrophotometry';
    case 'reports': return 'nav.reports';
    case 'methods': return 'nav.methods';
    case 'user-management': return 'nav.user-management';
    case 'audit-logs': return 'nav.audit-logs';
    case 'settings': return 'nav.settings';
    default: return 'nav.dashboard';
  }
}

export default function Layout({ children, activeView, contentKey, onViewChange, onGlobalSearch, onLogout, user }: LayoutProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isLanguageOpen, setLanguageOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join('');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleViewChange = (view: View) => {
    setHelpOpen(false);
    setLanguageOpen(false);
    onViewChange(view);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.userRole));

  const handleGlobalSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = globalSearchQuery.trim();

    if (!query) return;

    setHelpOpen(false);
    setLanguageOpen(false);
    onGlobalSearch(query);
  };

  return (
    <div className="min-h-screen bg-[#0b1121] text-white selection:bg-primary/30 lab-grid">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[140px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[140px] opacity-60" />
      </div>

      {/* Sidebar */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label={t('layout.sidebar.close')}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#020617]/65 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 glass-panel border-r border-white-[0.03] transition-all duration-500 ease-in-out ${
          isSidebarOpen ? 'translate-x-0 lg:w-72' : '-translate-x-full lg:translate-x-0 lg:w-20'
        } w-[86vw] max-w-72 lg:w-auto`}
      >
        <div className="flex flex-col h-full scrollbar-none">
          {/* Logo Area */}
          <div className="h-20 flex items-center gap-4 px-6 mb-8 mt-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(118,243,234,0.15)] group transition-transform hover:scale-105">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              >
                <div className="text-[#003734]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 3.33-1 4.5s3 1 4.5-1M22 2l-1.5 1.5M16.5 4.5L18 3M11 7l1.5 1.5M15 11l1.5 1.5M5 19l1.5 1.5"/><path d="M11 11L7 15l-1.5-1.5L9.5 9.5 11 11z"/><path d="M15 15l-4 4-1.5-1.5 4-4 1.5 1.5z"/><path d="M19 19l-4 4-1.5-1.5 4-4 1.5 1.5z"/><path d="M22 22l-1.5-1.5"/><path d="M9 14l5-5"/></svg>
                </div>
              </motion.div>
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="whitespace-nowrap"
                >
                  <h1 className="text-lg font-bold tracking-tight text-white font-display">Expert Chemistry</h1>
                  <p className="text-[9px] uppercase tracking-[0.3em] text-secondary font-mono font-bold">{t('layout.logo.subtitle')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5 px-3">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleViewChange(item.id)}
                className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-300 group relative
                  ${activeView === item.id 
                    ? 'bg-white/10 text-primary border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
                    : 'text-white/40 hover:bg-white/[0.03] hover:text-white'}`}
              >
                <item.icon size={18} className={`transition-all duration-300 ${activeView === item.id ? 'text-primary' : 'group-hover:text-white group-hover:scale-110'}`} />
                {isSidebarOpen && <span className="font-medium text-sm tracking-wide">{t(getNavLabelKey(item.id))}</span>}
                {activeView === item.id && (
                  <motion.div 
                    layoutId="activeBar"
                    className="absolute left-0 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(167,200,255,0.5)]"
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Footer Navigation */}
          <div className="mt-auto px-3 pb-8 space-y-1.5 border-t border-white-[0.03] pt-6">
            {OTHER_ITEMS.map((item) => (
              <button
                key={item.id}
                id={`nav-other-${item.id}`}
                onClick={() => handleViewChange(item.id)}
                className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-300 group
                  ${activeView === item.id 
                    ? 'bg-white/10 text-primary border border-white/10' 
                    : 'text-white/40 hover:bg-white/[0.03] hover:text-white'}`}
              >
                <item.icon size={18} className={`transition-all duration-300 ${activeView === item.id ? 'text-primary' : 'group-hover:text-white group-hover:scale-110'}`} />
                {isSidebarOpen && <span className="font-medium text-sm tracking-wide">{t(getNavLabelKey(item.id))}</span>}
              </button>
            ))}
            
            <div className="pt-6 flex items-center gap-4 px-2">
              <div className="relative shrink-0 group cursor-pointer">
                <div className="absolute inset-0 bg-primary/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                {user.avatar ? (
                  <img src={user.avatar} alt="User" className="relative w-10 h-10 rounded-xl border border-white/10 p-0.5 object-cover bg-white/5" />
                ) : (
                  <div className="relative w-10 h-10 rounded-xl border border-white/10 bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center text-[#04243d] font-bold text-sm">
                    {initials || 'U'}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-secondary border-2 border-[#0b1121] rounded-full shadow-[0_0_10px_rgba(118,243,234,0.5)]" />
              </div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate leading-none mb-1.5">{user.name}</p>
                  <p className="text-[10px] text-primary font-mono truncate uppercase tracking-widest font-semibold">{user.role}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`transition-all duration-500 ease-in-out ${
          isSidebarOpen ? 'lg:pl-72' : 'lg:pl-20'
        } pl-0`}
      >
        {/* Top Bar */}
        <header className="glass-panel border border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4 sticky top-3 sm:top-4 z-40 mx-3 sm:mx-4 lg:mx-6 mt-3 sm:mt-6 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 w-full lg:max-w-2xl">
            <button 
              id="sidebar-toggle"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-white/5 bg-white/[0.02] border border-white/5 rounded-xl text-white/40 hover:text-white transition-all active:scale-95"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <form onSubmit={handleGlobalSearch} className="relative flex-1 group min-w-0">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-all group-focus-within:scale-110" />
              <input 
                type="search"
                value={globalSearchQuery}
                onChange={(event) => setGlobalSearchQuery(event.target.value)}
                placeholder={t('layout.search.placeholder')} 
                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-primary/20 rounded-xl py-3 pl-12 pr-4 text-sm outline-none transition-all placeholder:text-white/20 focus:bg-white/[0.08] focus:shadow-[0_0_40px_rgba(167,200,255,0.05)]"
              />
            </form>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full lg:w-auto">
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <button
                  id="language-btn"
                  type="button"
                  aria-expanded={isLanguageOpen}
                  aria-controls="language-panel"
                  onClick={() => {
                    setLanguageOpen((current) => !current);
                    setHelpOpen(false);
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-mono font-bold uppercase tracking-[0.18em] transition-all ${
                    isLanguageOpen
                      ? 'text-primary bg-primary/10 border-primary/20'
                      : 'text-white/45 hover:text-white hover:bg-white/5 border-transparent hover:border-white/5'
                  }`}
                >
                  <Languages size={18} />
                  {language.toUpperCase()}
                </button>

                <AnimatePresence>
                  {isLanguageOpen && (
                    <motion.div
                      id="language-panel"
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-white/10 bg-[#0b1121]/98 p-2 shadow-[0_24px_80px_rgba(2,6,23,0.6)] backdrop-blur-xl"
                    >
                      <p className="px-3 pb-2 pt-1 text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-white/35">
                        {t('layout.language.title')}
                      </p>
                      <div className="space-y-1">
                        {LANGUAGE_OPTIONS.map((option) => {
                          const isSelected = language === option.id;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setLanguage(option.id);
                                setLanguageOpen(false);
                              }}
                              className={`w-full rounded-xl px-3 py-2.5 text-left transition-all ${
                                isSelected
                                  ? 'bg-primary/12 text-primary border border-primary/20'
                                  : 'text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent'
                              }`}
                            >
                              <span className="text-sm font-semibold">{t(option.labelKey)}</span>
                              <span className="ml-2 text-[10px] font-mono text-white/30">{option.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                id="help-btn"
                type="button"
                aria-expanded={isHelpOpen}
                aria-controls="help-faq-panel"
                onClick={() => {
                  setHelpOpen((current) => !current);
                  setLanguageOpen(false);
                }}
                className={`p-2.5 rounded-xl transition-all border ${
                  isHelpOpen
                    ? 'text-primary bg-primary/10 border-primary/20'
                    : 'text-white/40 hover:text-white hover:bg-white/5 border-transparent hover:border-white/5'
                }`}
              >
                <HelpCircle size={20} />
              </button>

              <AnimatePresence>
                {isHelpOpen && (
                  <motion.div
                    id="help-faq-panel"
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-12 z-50 w-[min(88vw,420px)] rounded-2xl border border-white/10 bg-[#0b1121]/98 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.6)] backdrop-blur-xl"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-primary font-bold">
                          {t('layout.help.quick')}
                        </p>
                        <h2 className="mt-1 text-sm font-semibold text-white">{t('layout.help.title')}</h2>
                      </div>
                      <button
                        type="button"
                        aria-label={t('layout.help.close')}
                        onClick={() => setHelpOpen(false)}
                        className="rounded-lg p-1.5 text-white/35 hover:bg-white/5 hover:text-white transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="mt-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                      {FAQ_ITEMS.map((item) => (
                        <div key={item.questionKey} className="rounded-xl border border-white/8 bg-white/[0.025] p-3 mb-2 last:mb-0">
                          <p className="text-sm font-semibold text-white leading-snug">{t(item.questionKey)}</p>
                          <p className="mt-2 text-xs leading-relaxed text-white/55">{t(item.answerKey)}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-6">
              <button id="logout-btn" title={t('layout.logout')} onClick={onLogout} className="p-2.5 text-white/20 hover:text-error hover:bg-error/10 hover:border-error/20 border border-transparent rounded-xl transition-all active:scale-95">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-3 sm:px-4 lg:px-10 py-6 sm:py-8 lg:py-10 min-h-[calc(100vh-120px)] relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={contentKey}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

