import { Suspense, lazy, useEffect, useState } from 'react';
import Layout from './components/Layout';
import { View } from './constants';
import type { AuthUser } from './types/auth';

import AuthView from './views/Auth';

const Dashboard = lazy(() => import('./views/Dashboard'));
const Equipment = lazy(() => import('./views/Equipment'));
const Reports = lazy(() => import('./views/Reports'));
const Clients = lazy(() => import('./views/Clients'));
const Methods = lazy(() => import('./views/Methods'));
const Settings = lazy(() => import('./views/Settings'));
const FileUpload = lazy(() => import('./views/FileUpload'));
const Spectrophotometry = lazy(() => import('./views/Spectrophotometry'));
const UserManagement = lazy(() => import('./views/UserManagement'));
const AuditLogs = lazy(() => import('./views/AuditLogs'));

type SpectrophotometryTab = 'calculate' | 'saved';
type ViewOptions = {
  spectrophotometryTab?: SpectrophotometryTab;
  reportsProjectKey?: string;
  reportsProjectLabel?: string;
};

function ViewLoadingFallback() {
  return (
    <div className="glass-panel rounded-[28px] px-8 py-6 text-center border-white/10">
      <p className="text-sm uppercase tracking-[0.28em] text-secondary font-semibold">Loading View</p>
      <p className="mt-3 text-white/70">Preparing the selected workspace...</p>
    </div>
  );
}

function normalizeAuthUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AuthUser>;
  const parsedId =
    typeof candidate.id === 'number'
      ? candidate.id
      : typeof candidate.id === 'string'
        ? Number(candidate.id)
        : Number.NaN;

  if (!Number.isFinite(parsedId)) {
    return null;
  }

  return {
    id: parsedId,
    userId: typeof candidate.userId === 'string' ? candidate.userId : '',
    fullName: typeof candidate.fullName === 'string' ? candidate.fullName : 'Unknown User',
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '',
    role: candidate.role === 'admin' ? 'admin' : 'user'
  };
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [viewResetKey, setViewResetKey] = useState(0);
  const [spectrophotometryInitialTab, setSpectrophotometryInitialTab] = useState<SpectrophotometryTab | undefined>();
  const [reportsInitialProjectKey, setReportsInitialProjectKey] = useState<string | undefined>();
  const [reportsInitialProjectLabel, setReportsInitialProjectLabel] = useState<string | undefined>();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });

        if (!response.ok) {
          if (isMounted) {
            setCurrentUser(null);
          }
          return;
        }

        const payload = await response.json();
        const normalizedUser = normalizeAuthUser(payload.user);

        if (isMounted) {
          setCurrentUser(normalizedUser);
        }
      } catch (error) {
        console.error('Failed to check current session:', error);
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuthenticated = (user: AuthUser) => {
    const normalizedUser = normalizeAuthUser(user);

    if (!normalizedUser) {
      console.error('Received invalid auth user payload:', user);
      setCurrentUser(null);
      return;
    }

    setCurrentUser(normalizedUser);
    setActiveView('dashboard');
    setSpectrophotometryInitialTab(undefined);
    setReportsInitialProjectKey(undefined);
    setReportsInitialProjectLabel(undefined);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to log out:', error);
    } finally {
      setCurrentUser(null);
      setActiveView('dashboard');
      setSpectrophotometryInitialTab(undefined);
      setReportsInitialProjectKey(undefined);
      setReportsInitialProjectLabel(undefined);
    }
  };

  const handleViewChange = (view: View) => {
    setSpectrophotometryInitialTab(undefined);
    setReportsInitialProjectKey(undefined);
    setReportsInitialProjectLabel(undefined);
    setActiveView((currentView) => {
      if (currentView === view) {
        setViewResetKey((currentKey) => currentKey + 1);
      }

      return view;
    });
  };

  const handleOpenView = (view: View, options?: ViewOptions) => {
    setSpectrophotometryInitialTab(options?.spectrophotometryTab);
    setReportsInitialProjectKey(options?.reportsProjectKey);
    setReportsInitialProjectLabel(options?.reportsProjectLabel);
    setActiveView(view);
  };

  const renderView = (user: AuthUser) => {
    switch (activeView) {
      case 'dashboard': return <Dashboard currentUser={user} onOpenView={handleOpenView} />;
      case 'spectrophotometry': return <Spectrophotometry currentUser={user} initialTab={spectrophotometryInitialTab} />;
      case 'equipment': return <Equipment />;
      case 'reports': return <Reports currentUser={user} initialProjectKey={reportsInitialProjectKey} initialProjectLabel={reportsInitialProjectLabel} />;
      case 'clients': return <Clients />;
      case 'methods': return <Methods currentUser={user} />;
      case 'settings': return <Settings />;
      case 'upload': return <FileUpload />;
      case 'user-management': return <UserManagement currentUser={user} />;
      case 'audit-logs': return <AuditLogs />;
      default: return <Dashboard currentUser={user} onOpenView={handleOpenView} />;
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#0b1121] text-white flex items-center justify-center">
        <div className="glass-panel rounded-[28px] px-8 py-6 text-center border-white/10">
          <p className="text-sm uppercase tracking-[0.28em] text-secondary font-semibold">Checking Session</p>
          <p className="mt-3 text-white/70">Validating the active lab account...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  return (
    <Layout
      activeView={activeView}
      contentKey={`${activeView}:${viewResetKey}`}
      onViewChange={handleViewChange}
      onLogout={handleLogout}
      user={{
        name: currentUser.fullName,
        role: `${currentUser.role.toUpperCase()} - ${currentUser.userId}`,
        userRole: currentUser.role
      }}
    >
      <Suspense fallback={<ViewLoadingFallback />}>
        {renderView(currentUser)}
      </Suspense>
    </Layout>
  );
}
