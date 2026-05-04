import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  ChevronRight,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { NAV_ITEMS, OTHER_ITEMS, View } from '../constants';
import type { UserRole } from '../types/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  user: {
    name: string;
    role: string;
    userRole: UserRole;
    avatar?: string;
  };
}

export default function Layout({ children, activeView, onViewChange, onLogout, user }: LayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
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
    onViewChange(view);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.userRole));

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
          aria-label="Close sidebar overlay"
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
                  <p className="text-[9px] uppercase tracking-[0.3em] text-secondary font-mono font-bold">Automation Core</p>
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
                {isSidebarOpen && <span className="font-medium text-sm tracking-wide">{item.label}</span>}
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
                {isSidebarOpen && <span className="font-medium text-sm tracking-wide">{item.label}</span>}
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
            <div className="relative flex-1 group min-w-0">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-all group-focus-within:scale-110" />
              <input 
                type="text" 
                placeholder="Search molecular data, equipment or protocols..." 
                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-primary/20 rounded-xl py-3 pl-12 pr-4 text-sm outline-none transition-all placeholder:text-white/20 focus:bg-white/[0.08] focus:shadow-[0_0_40px_rgba(167,200,255,0.05)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <button id="noti-btn" className="p-2.5 text-white/40 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 rounded-xl transition-all relative group">
                <Bell size={20} className="group-hover:rotate-12 transition-transform" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-secondary rounded-full border-2 border-[#161d2f] animate-pulse shadow-[0_0_10px_rgba(118,243,234,0.5)]" />
              </button>
              <button id="help-btn" className="p-2.5 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <HelpCircle size={20} />
              </button>
            </div>
            
            <div className="hidden sm:block h-8 w-px bg-white/10" />
            
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="text-right hidden md:block">
                <span className="text-[9px] font-mono text-secondary uppercase tracking-[0.2em] block mb-0.5 font-bold">System Status: Live</span>
                <p className="text-sm font-bold text-white leading-none font-mono">08:42:15</p>
              </div>
              <button id="logout-btn" title="System Logout" onClick={onLogout} className="p-2.5 text-white/20 hover:text-error hover:bg-error/10 hover:border-error/20 border border-transparent rounded-xl transition-all active:scale-95">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-3 sm:px-4 lg:px-10 py-6 sm:py-8 lg:py-10 min-h-[calc(100vh-120px)] relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
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

