import type { AgencyStatus, StatusCategory } from '@/types';

export const normalizeStatusesForUi = (list: AgencyStatus[]): AgencyStatus[] =>
  list.map((status, index) => ({ ...status, is_default: index === 0, sort_order: index + 1, is_terminal: status.category === 'done' }));

export const generateStatusId = (): string | null => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return null;
};

export const addUniqueItem = (item: string, list: string[], uppercase = false): string[] => {
  const value = uppercase ? item.toUpperCase() : item;
  if (!value || list.includes(value)) return list;
  return [...list, value];
};

export const removeItemAt = (index: number, list: string[]) => list.filter((_, currentIndex) => currentIndex !== index);

export const updateItemAt = (index: number, value: string, list: string[], uppercase = false) => {
  const next = [...list];
  next[index] = uppercase ? value.toUpperCase() : value;
  return next;
};

export const createStatus = (label: string, category: StatusCategory, sortOrder: number): AgencyStatus | null => {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const id = generateStatusId();
  if (!id) return null;
  return { id, label: trimmed, category, is_terminal: category === 'done', is_default: false, sort_order: sortOrder };
};
