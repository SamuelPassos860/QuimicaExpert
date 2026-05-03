import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import { View } from './constants';
import type { AuthUser } from './types/auth';

// Placeholder Views (will be implemented in separate files)
import Dashboard from './views/Dashboard';
import Equipment from './views/Equipment';
import Reports from './views/Reports';
import Clients from './views/Clients';
import Methods from './views/Methods';
import Settings from './views/Settings';
import FileUpload from './views/FileUpload';
import Spectrophotometry from './views/Spectrophotometry';
import AuthView from './views/Auth';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
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

        if (isMounted) {
          setCurrentUser(payload.user as AuthUser);
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
    setCurrentUser(user);
    setActiveView('dashboard');
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
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'spectrophotometry': return <Spectrophotometry />;
      case 'equipment': return <Equipment />;
      case 'reports': return <Reports />;
      case 'clients': return <Clients />;
      case 'methods': return <Methods />;
      case 'settings': return <Settings />;
      case 'upload': return <FileUpload />;
      default: return <Dashboard />;
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
      onViewChange={setActiveView}
      onLogout={handleLogout}
      user={{
        name: currentUser.fullName,
        role: `User ID: ${currentUser.userId}`
      }}
    >
      {renderView()}
    </Layout>
  );
}
