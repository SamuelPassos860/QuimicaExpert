import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  Users, 
  FlaskConical, 
  Settings as SettingsIcon,
  Beaker,
  Waves
} from 'lucide-react';

export type View =
  | 'dashboard'
  | 'upload'
  | 'reports'
  | 'clients'
  | 'equipment'
  | 'methods'
  | 'spectrophotometry'
  | 'settings'
  | 'login';

export interface NavItem {
  id: View;
  label: string;
  icon: any;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'spectrophotometry', label: 'Spectrophotometry', icon: Waves },
  { id: 'upload', label: 'File Upload', icon: Upload },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'equipment', label: 'Equipment', icon: FlaskConical },
  { id: 'methods', label: 'Methods', icon: Beaker },
];

export const OTHER_ITEMS: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];
