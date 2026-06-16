import { 
  LayoutDashboard, 
  FileText, 
  Beaker,
  Waves,
  ShieldCheck,
  ScrollText
} from 'lucide-react';
import type { UserRole } from './types/auth';

export type View =
  | 'dashboard'
  | 'reports'
  | 'methods'
  | 'spectrophotometry'
  | 'login'
  | 'user-management'
  | 'audit-logs';

export interface NavItem {
  id: View;
  label: string;
  icon: any;
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { id: 'spectrophotometry', label: 'Spectrophotometry', icon: Waves, roles: ['admin'] },
  { id: 'reports', label: 'Reports', icon: FileText, roles: ['admin', 'analyst'] },
  { id: 'methods', label: 'Methods', icon: Beaker, roles: ['admin', 'analyst'] },
  { id: 'user-management', label: 'User Management', icon: ShieldCheck, roles: ['admin'] },
  { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText, roles: ['admin', 'analyst'] },
];

export const OTHER_ITEMS: NavItem[] = [];
