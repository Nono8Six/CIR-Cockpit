import type { VisibilityState } from '@tanstack/react-table';
import type { DirectorySortBy } from 'shared/schemas/directory.schema';

export const DIRECTORY_COLUMN_ORDER: DirectorySortBy[] = [
  'entity_type',
  'client_number',
  'name',
  'city',
  'department',
  'agency_name',
  'cir_commercial_name',
  'updated_at'
];

export const DIRECTORY_COLUMN_LABELS: Record<DirectorySortBy, string> = {
  entity_type: 'Type',
  client_number: 'N° client',
  name: 'Nom',
  city: 'Ville',
  department: 'Département',
  agency_name: 'Agence',
  cir_commercial_name: 'Commercial CIR',
  updated_at: 'Mis à jour'
};

export const DIRECTORY_COLUMN_CAN_HIDE: Record<DirectorySortBy, boolean> = {
  entity_type: true,
  client_number: true,
  name: false,
  city: true,
  department: true,
  agency_name: true,
  cir_commercial_name: true,
  updated_at: true
};

export const MOBILE_DIRECTORY_COLUMN_VISIBILITY: VisibilityState = {
  department: false,
  agency_name: false,
  cir_commercial_name: false,
  updated_at: false
};

export const buildDirectoryViewOptionColumns = (columnVisibility: VisibilityState) =>
  DIRECTORY_COLUMN_ORDER.map((id) => ({
    id,
    label: DIRECTORY_COLUMN_LABELS[id],
    canHide: DIRECTORY_COLUMN_CAN_HIDE[id],
    isVisible: columnVisibility[id] !== false
  }));
