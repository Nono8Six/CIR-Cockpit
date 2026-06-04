import type { ConfigUsageRow } from '../../../../../shared/schemas/system/config.schema';

export const DIMENSION_LABELS: Record<ConfigUsageRow['dimension'] & string, string> = {
  statuses: 'Statuts',
  services: 'Services',
  families: 'Familles produits',
  interaction_types: "Types d'interaction"
};

export type IntegrityAction = 'inspect' | 'restore' | 'resolve' | 'unresolve' | 'create';
