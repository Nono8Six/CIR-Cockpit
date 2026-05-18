import type { VisibilityState } from '@tanstack/react-table';
import type { DirectorySortBy } from 'shared/schemas/directory.schema';

export const SUPPLIER_COLUMN_ORDER: DirectorySortBy[] = [
  'entity_type',
  'supplier_code',
  'supplier_number',
  'name',
  'siret',
  'naf_code',
  'primary_contact',
  'city',
  'department',
  'updated_at'
];

export const SUPPLIER_COLUMN_LABELS: Record<DirectorySortBy, string> = {
  entity_type: 'Type',
  client_number: 'N° client',
  supplier_code: 'Code interne',
  supplier_number: 'N° fournisseur',
  name: 'Fournisseur',
  city: 'Ville',
  department: 'Département',
  siret: 'SIRET',
  siren: 'SIREN',
  naf_code: 'NAF',
  agency_name: 'Agence',
  cir_commercial_name: 'Commercial CIR',
  primary_contact: 'Contact',
  updated_at: 'Mis à jour'
};

const SUPPLIER_COLUMN_CAN_HIDE: Record<DirectorySortBy, boolean> = {
  entity_type: true,
  client_number: true,
  supplier_code: true,
  supplier_number: true,
  name: false,
  city: true,
  department: true,
  siret: true,
  siren: true,
  naf_code: true,
  agency_name: true,
  cir_commercial_name: true,
  primary_contact: true,
  updated_at: true
};

export const MOBILE_SUPPLIER_COLUMN_VISIBILITY: VisibilityState = {
  supplier_code: false,
  supplier_number: false,
  siret: false,
  naf_code: false,
  department: false,
  updated_at: false
};

export const DESKTOP_SUPPLIER_COLUMN_VISIBILITY: VisibilityState = {
  supplier_code: false,
  supplier_number: false
};

export const buildSupplierViewOptionColumns = (columnVisibility: VisibilityState) =>
  SUPPLIER_COLUMN_ORDER.map((id) => ({
    id,
    label: SUPPLIER_COLUMN_LABELS[id],
    canHide: SUPPLIER_COLUMN_CAN_HIDE[id],
    isVisible: columnVisibility[id] !== false
  }));
