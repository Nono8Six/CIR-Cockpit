import type { AgencyStatus, StatusCategory } from '@/types';
import { createAppError } from '@/services/errors/AppError';

export type ConfigTable = 'agency_statuses' | 'agency_services' | 'agency_entities' | 'agency_families' | 'agency_interaction_types';

export const TABLE_LABELS: Record<ConfigTable, string> = {
  agency_statuses: 'les statuts',
  agency_services: 'les services',
  agency_entities: 'les entites',
  agency_families: 'les familles',
  agency_interaction_types: "les types d'interaction"
};

const STATUS_CATEGORIES: StatusCategory[] = ['todo', 'in_progress', 'done'];

export const normalizeLabelList = (labels: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    normalized.push(trimmed);
  }
  return normalized;
};

export const normalizeStatusList = (statuses: AgencyStatus[]): AgencyStatus[] => {
  const seen = new Set<string>();
  const normalized: AgencyStatus[] = [];

  for (const status of statuses) {
    const label = status.label.trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    if (!STATUS_CATEGORIES.includes(status.category)) {
      throw createAppError({ code: 'CONFIG_INVALID', message: `Categorie de statut invalide: ${status.category}`, source: 'client' });
    }
    seen.add(key);
    normalized.push({ id: status.id, label, category: status.category, is_terminal: status.category === 'done', is_default: false, sort_order: normalized.length + 1 });
  }

  if (normalized.length > 0) normalized[0] = { ...normalized[0], is_default: true };
  return normalized;
};
