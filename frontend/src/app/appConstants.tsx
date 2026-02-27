import { Building2, LayoutDashboard, PenTool, Shield } from 'lucide-react';

import type { NavigationTab } from '@/components/AppHeader';
import type { AgencyConfig } from '@/services/config';
import type { UserRole } from '@/types';

export const EMPTY_CONFIG: AgencyConfig = {
  statuses: [],
  services: [],
  entities: [],
  families: [],
  interactionTypes: []
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super admin',
  agency_admin: 'Admin agence',
  tcs: 'TCS'
};

export const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  super_admin: 'bg-success/12 text-success border-success/35',
  agency_admin: 'bg-warning/15 text-warning-foreground border-warning/35',
  tcs: 'bg-muted text-muted-foreground border-border'
};

export const buildNavigationTabs = (canAccessAdmin: boolean, pendingCount: number): NavigationTab[] => {
  const tabs: NavigationTab[] = [
    {
      value: 'cockpit',
      icon: <PenTool size={14} />,
      label: <span className="hidden sm:inline">Saisie (F1)</span>,
      ariaLabel: 'Saisie (F1)'
    },
    {
      value: 'dashboard',
      icon: <LayoutDashboard size={14} />,
      label: <span className="hidden sm:inline">Pilotage (F2)</span>,
      ariaLabel: 'Pilotage (F2)',
      badge: pendingCount > 0 ? <span className="bg-primary text-white text-xs px-1.5 rounded-full font-bold ml-1 shadow-sm">{pendingCount}</span> : null
    },
    {
      value: 'clients',
      icon: <Building2 size={14} />,
      label: <span className="hidden sm:inline">Clients (F5)</span>,
      ariaLabel: 'Clients (F5)'
    }
  ];

  if (canAccessAdmin) {
    tabs.push({
      value: 'admin',
      icon: <Shield size={14} />,
      label: <span className="hidden sm:inline">Admin (F4)</span>,
      ariaLabel: 'Admin (F4)'
    });
  }

  return tabs;
};
