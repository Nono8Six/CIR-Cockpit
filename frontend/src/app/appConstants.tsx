import type { LucideIcon } from 'lucide-react';
import { Building2, Gauge, PenLine, Settings, Shield } from 'lucide-react';

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
  clients: 'F1',
  cockpit: 'F3',
  dashboard: 'F4',
  admin: 'F7',
  settings: 'F8'
};

export const SEARCH_SHORTCUT_ARIA = 'Control+K Meta+K';
export const SIDEBAR_TOGGLE_SHORTCUT_ARIA = 'Control+B Meta+B Control+Backslash Meta+Backslash';
const APPLE_PLATFORM_PATTERN = /(Mac|iPhone|iPad|iPod)/i;

type SidebarToggleShortcutEvent = Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'key' | 'metaKey'>;

export const isApplePlatform = (): boolean =>
  typeof navigator !== 'undefined' && APPLE_PLATFORM_PATTERN.test(navigator.platform);

export const getPlatformShortcutLabel = (key: string): string =>
  `${isApplePlatform() ? '\u2318' : 'Ctrl'} ${key.trim().toUpperCase()}`;

export const getSearchShortcutLabel = (): string => getPlatformShortcutLabel('K');

export const getSidebarToggleShortcutLabel = (): string => getPlatformShortcutLabel('B');

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
  icon: LucideIcon;
  shortcut: string;
  metaLabel?: string;
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

const formatPendingNavLabel = (pendingCount: number): string | undefined => {
  if (pendingCount <= 0) {
    return undefined;
  }

  return String(pendingCount);
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
          icon: PenLine,
          shortcut: APP_TAB_SHORTCUTS.cockpit
        },
        {
          id: 'dashboard',
          sectionId: 'interactions',
          label: 'Pilotage',
          icon: Gauge,
          shortcut: APP_TAB_SHORTCUTS.dashboard,
          metaLabel: formatPendingNavLabel(pendingCount)
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
          icon: Shield,
          shortcut: APP_TAB_SHORTCUTS.admin
        },
        {
          id: 'settings',
          sectionId: 'admin',
          label: 'Param\u00E8tres',
          icon: Settings,
          shortcut: APP_TAB_SHORTCUTS.settings
        }
      ]
    });
  }

  return sections;
};
