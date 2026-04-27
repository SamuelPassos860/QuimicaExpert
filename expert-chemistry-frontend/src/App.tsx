import { useState } from 'react';
import Layout from './components/Layout';
import { View } from './constants';

// Placeholder Views (will be implemented in separate files)
import Dashboard from './views/Dashboard';
import Equipment from './views/Equipment';
import Reports from './views/Reports';
import Clients from './views/Clients';
import Methods from './views/Methods';
import Settings from './views/Settings';
import FileUpload from './views/FileUpload';
import Spectrophotometry from './views/Spectrophotometry';

const MOCK_USER = {
  name: 'Dr. Aris Thorne',
  role: 'Chief Investigator',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAaB3vkfALpkoBsBS15qf1WK9Tfz2O_KzLd0iPLuHS83CKmbpsZa18hAF-vEtW9iSGufry27zL4rd31JSX_wdPT4JXghOammZOk8BVND6PSEuAIvWgVc16sQtNXaC7yF5w4KkMwflrQAL_E-dSARoJtGtJh1m_-fq02cuYwgo6asbirzzu6wZFWnJS1yTpXXLM-Jvq7aCV_CBZZPx8HrSdxYa-BfzUNyxRbyAl3C-wHAAA_8A7eTy8nODoz0-kDQrhT5E0g5ckR1zE'
};

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');

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

  return (
    <Layout 
      activeView={activeView} 
      onViewChange={setActiveView}
      user={MOCK_USER}
    >
      {renderView()}
    </Layout>
  );
}
