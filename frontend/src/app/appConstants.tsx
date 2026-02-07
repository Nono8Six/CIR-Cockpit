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
  super_admin: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  agency_admin: 'bg-amber-50 text-amber-700 border-amber-200',
  tcs: 'bg-slate-100 text-slate-600 border-slate-200'
};

export const buildNavigationTabs = (canAccessAdmin: boolean, pendingCount: number): NavigationTab[] => {
  const tabs: NavigationTab[] = [
    {
      value: 'cockpit',
      icon: <PenTool size={14} />,
      label: <span className="hidden sm:inline">Saisie (F1)</span>
    },
    {
      value: 'dashboard',
      icon: <LayoutDashboard size={14} />,
      label: <span className="hidden sm:inline">Pilotage (F2)</span>,
      badge: pendingCount > 0 ? <span className="bg-cir-red text-white text-[10px] px-1.5 rounded-full font-bold ml-1 shadow-sm">{pendingCount}</span> : null
    },
    {
      value: 'clients',
      icon: <Building2 size={14} />,
      label: <span className="hidden sm:inline">Clients (F5)</span>
    }
  ];

  if (canAccessAdmin) {
    tabs.push({
      value: 'admin',
      icon: <Shield size={14} />,
      label: <span className="hidden sm:inline">Admin (F4)</span>
    });
  }

  return tabs;
};
