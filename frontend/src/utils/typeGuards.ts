import type { AppTab, StatusCategory, UserRole } from '@/types';

const APP_TABS: AppTab[] = ['cockpit', 'dashboard', 'settings', 'clients', 'suppliers', 'referentials', 'admin'];
const USER_ROLES: UserRole[] = ['super_admin', 'agency_admin', 'tcs'];
const STATUS_CATEGORIES: StatusCategory[] = ['todo', 'in_progress', 'done'];

export const isAppTab = (value: string): value is AppTab => APP_TABS.some(item => item === value);
export const isUserRole = (value: string): value is UserRole => USER_ROLES.some(item => item === value);
export const isStatusCategory = (value: string): value is StatusCategory => STATUS_CATEGORIES.some(item => item === value);
