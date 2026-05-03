import { useState } from 'react';
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

const AUTH_STORAGE_KEY = 'expert-chemistry-user';

function getStoredUser() {
  const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as AuthUser;
  } catch (error) {
    console.error('Failed to parse stored auth user:', error);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());

  const handleAuthenticated = (user: AuthUser) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setCurrentUser(null);
    setActiveView('dashboard');
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
