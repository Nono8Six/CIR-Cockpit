import type { AppTab } from '@/types';

export const APP_TAB_PATHS: Record<AppTab, string> = {
  cockpit: '/cockpit',
  dashboard: '/dashboard',
  settings: '/settings',
  clients: '/clients',
  admin: '/admin'
};

const ROUTE_TO_TAB = new Map<string, AppTab>(
  Object.entries(APP_TAB_PATHS).map(([tab, path]) => [path, tab as AppTab])
);

const normalizePathname = (pathname: string): string => {
  if (pathname === '/' || pathname.length === 0) return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
};

export const getPathForTab = (tab: AppTab): string => APP_TAB_PATHS[tab];

export const getTabFromPathname = (pathname: string): AppTab => {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === '/') return 'cockpit';
  if (normalizedPath === APP_TAB_PATHS.clients || normalizedPath.startsWith(`${APP_TAB_PATHS.clients}/`)) {
    return 'clients';
  }
  if (normalizedPath === APP_TAB_PATHS.admin || normalizedPath.startsWith(`${APP_TAB_PATHS.admin}/`)) {
    return 'admin';
  }
  if (normalizedPath === APP_TAB_PATHS.settings || normalizedPath.startsWith(`${APP_TAB_PATHS.settings}/`)) {
    return 'settings';
  }
  if (normalizedPath === APP_TAB_PATHS.dashboard || normalizedPath.startsWith(`${APP_TAB_PATHS.dashboard}/`)) {
    return 'dashboard';
  }
  if (normalizedPath === APP_TAB_PATHS.cockpit || normalizedPath.startsWith(`${APP_TAB_PATHS.cockpit}/`)) {
    return 'cockpit';
  }

  const matchedTab = ROUTE_TO_TAB.get(normalizedPath);
  if (matchedTab) return matchedTab;

  return 'cockpit';
};

export const isInteractionTab = (tab: AppTab): boolean =>
  tab === 'cockpit' || tab === 'dashboard' || tab === 'settings';
