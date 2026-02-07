import type { AppTab, StatusCategory, UserRole } from '@/types';
import type { FilterPeriod } from '@/utils/date/getPresetDateRange';
import type { ClientsPanelViewMode } from '@/components/clients/ClientsPanel.shared';

const APP_TABS: AppTab[] = ['cockpit', 'dashboard', 'settings', 'clients', 'admin'];
const USER_ROLES: UserRole[] = ['super_admin', 'agency_admin', 'tcs'];
const FILTER_PERIODS: FilterPeriod[] = ['today', 'yesterday', 'last7', 'thisMonth', 'lastMonth', 'custom'];
const CLIENTS_PANEL_MODES: ClientsPanelViewMode[] = ['clients', 'prospects'];
const STATUS_CATEGORIES: StatusCategory[] = ['todo', 'in_progress', 'done'];

export const isAppTab = (value: string): value is AppTab => APP_TABS.some(item => item === value);
export const isUserRole = (value: string): value is UserRole => USER_ROLES.some(item => item === value);
export const isFilterPeriod = (value: string): value is FilterPeriod => FILTER_PERIODS.some(item => item === value);
export const isClientsPanelViewMode = (value: string): value is ClientsPanelViewMode => CLIENTS_PANEL_MODES.some(item => item === value);
export const isStatusCategory = (value: string): value is StatusCategory => STATUS_CATEGORIES.some(item => item === value);
