import { SYSTEM_INTERACTION_VALUES } from '../../../../../shared/reference/systemInteractionValues';
import type { ConfigUsageRow } from '../../../../../shared/schemas/system/config.schema';

export interface SystemManagedGroup {
  key: string;
  title: string;
  description: string;
  rows: ConfigUsageRow[];
  inspectRow: ConfigUsageRow;
}

interface GroupDefinition {
  key: string;
  title: string;
  description: string;
  matches: (row: ConfigUsageRow) => boolean;
}

const matchesLabel = (
  row: ConfigUsageRow,
  dimension: ConfigUsageRow['dimension'],
  label: string
): boolean => row.dimension === dimension && row.label.trim().toLowerCase() === label.toLowerCase();

const DEFINITIONS: GroupDefinition[] = [
  {
    key: 'supplier',
    title: 'Interactions fournisseur',
    description: 'Le parcours fournisseur applique automatiquement ces libellés réservés.',
    matches: (row) =>
      matchesLabel(row, 'services', SYSTEM_INTERACTION_VALUES.supplier.service)
      || matchesLabel(row, 'interaction_types', SYSTEM_INTERACTION_VALUES.supplier.interactionType)
  },
  {
    key: 'internal',
    title: 'Interactions internes',
    description: 'Les échanges internes CIR utilisent un service réservé, sans apparaître dans vos listes de saisie.',
    matches: (row) => matchesLabel(row, 'services', SYSTEM_INTERACTION_VALUES.internal.service)
  },
  {
    key: 'solicitation',
    title: 'Sollicitations commerciales',
    description: 'Le parcours de sollicitation applique automatiquement ces libellés réservés.',
    matches: (row) =>
      matchesLabel(row, 'services', SYSTEM_INTERACTION_VALUES.solicitation.service)
      || matchesLabel(row, 'interaction_types', SYSTEM_INTERACTION_VALUES.solicitation.interactionType)
  },
  {
    key: 'status-unassigned',
    title: 'Statut initial non requis',
    description: 'Certains parcours créent volontairement une interaction sans statut initial. Ce n’est pas une donnée perdue.',
    matches: (row) => row.dimension === 'statuses' && row.label === '<sans valeur>'
  }
];

export const groupSystemManagedRows = (rows: ConfigUsageRow[]): SystemManagedGroup[] => {
  const remaining = new Set(rows);
  const groups: SystemManagedGroup[] = DEFINITIONS.flatMap((definition) => {
    const matches = rows.filter((row) => remaining.has(row) && definition.matches(row));
    if (matches.length === 0) return [];
    matches.forEach((row) => remaining.delete(row));
    return [{
      key: definition.key,
      title: definition.title,
      description: definition.description,
      rows: matches,
      inspectRow: matches[0]
    }];
  });
  remaining.forEach((row) => {
    groups.push({
      key: `${row.dimension}-${row.label}`,
      title: row.label,
      description: 'Cette valeur est réservée par un parcours automatique.',
      rows: [row],
      inspectRow: row
    });
  });
  return groups;
};
