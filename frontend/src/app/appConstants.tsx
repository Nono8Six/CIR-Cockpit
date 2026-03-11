import type { LucideIcon } from 'lucide-react';
import { Building2, LayoutDashboard, PenTool, Settings, Shield } from 'lucide-react';

import type { AgencyConfig } from '@/services/config';
import type { AppTab, UserRole } from '@/types';

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

export const APP_TAB_SHORTCUTS: Record<AppTab, string> = {
  cockpit: 'F1',
  dashboard: 'F2',
  settings: 'F3',
  admin: 'F4',
  clients: 'F5'
};

export const SIDEBAR_TOGGLE_SHORTCUT_ARIA = 'Control+B Meta+B Control+Backslash Meta+Backslash';

type SidebarToggleShortcutEvent = Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'key' | 'metaKey'>;

export const getSidebarToggleShortcutLabel = (): string => {
  const isApplePlatform = typeof navigator !== 'undefined'
    && /(Mac|iPhone|iPad|iPod)/i.test(navigator.platform);
  return isApplePlatform ? '⌘\u00A0B' : 'Ctrl+\u00A0B';
};

export const isSidebarToggleShortcut = (event: SidebarToggleShortcutEvent): boolean => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return false;
  }

  return event.key.toLowerCase() === 'b' || event.code === 'Backslash';
};

export type AppShellSectionId = 'clients' | 'interactions' | 'admin';

export type AppShellNavItem = {
  id: AppTab;
  sectionId: AppShellSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  shortcut: string;
  badgeCount?: number;
};

export type AppShellNavSection = {
  id: AppShellSectionId;
  title: string;
  items: AppShellNavItem[];
};

export const APP_SHELL_SECTION_LABELS: Record<AppShellSectionId, string> = {
  clients: 'Clients',
  interactions: 'Interactions',
  admin: 'Admin'
};

export const buildShellNavigation = (
  canAccessAdmin: boolean,
  pendingCount: number
): AppShellNavSection[] => {
  const sections: AppShellNavSection[] = [
    {
      id: 'clients',
      title: 'Clients',
      items: [
        {
          id: 'clients',
          sectionId: 'clients',
          label: 'Clients',
          description: 'CRM',
          icon: Building2,
          shortcut: APP_TAB_SHORTCUTS.clients
        }
      ]
    },
    {
      id: 'interactions',
      title: 'Interactions',
      items: [
        {
          id: 'cockpit',
          sectionId: 'interactions',
          label: 'Saisie',
          description: 'Nouveau',
          icon: PenTool,
          shortcut: APP_TAB_SHORTCUTS.cockpit
        },
        {
          id: 'dashboard',
          sectionId: 'interactions',
          label: 'Pilotage',
          description: 'Suivi',
          icon: LayoutDashboard,
          shortcut: APP_TAB_SHORTCUTS.dashboard,
          badgeCount: pendingCount > 0 ? pendingCount : undefined
        }
      ]
    }
  ];

  if (canAccessAdmin) {
    sections.push({
      id: 'admin',
      title: 'Admin',
      items: [
        {
          id: 'admin',
          sectionId: 'admin',
          label: 'Admin',
          description: 'Utilisateurs',
          icon: Shield,
          shortcut: APP_TAB_SHORTCUTS.admin
        },
        {
          id: 'settings',
          sectionId: 'admin',
          label: 'Paramètres',
          description: 'Agence',
          icon: Settings,
          shortcut: APP_TAB_SHORTCUTS.settings
        }
      ]
    });
  }

  return sections;
};
