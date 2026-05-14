import type { TierV1DirectoryRow } from 'shared/schemas/tier-v1.schema';

export const INTERNAL_RELATION_LABEL = 'Interne (CIR)';
export const SOLICITATION_RELATION_NORMALIZED = 'sollicitation';
export const INTERNAL_COMPANY_NAME = 'CIR';
export const TERM_CLIENT_RELATION_LABEL = 'Client à terme';
export const CASH_CLIENT_RELATION_LABEL = 'Client comptant';
export const INDIVIDUAL_RELATION_LABEL = 'Particulier';
export const PROSPECT_RELATION_LABEL = 'Prospect';
export const SUPPLIER_RELATION_LABEL = 'Fournisseur';
export const SOLICITATION_RELATION_LABEL = 'Sollicitation';
export const PRODUCT_RELATION_OPTIONS = [
  TERM_CLIENT_RELATION_LABEL,
  CASH_CLIENT_RELATION_LABEL,
  INDIVIDUAL_RELATION_LABEL,
  PROSPECT_RELATION_LABEL,
  SUPPLIER_RELATION_LABEL,
  SOLICITATION_RELATION_LABEL,
  INTERNAL_RELATION_LABEL
] as const;

export type RelationMode =
  | 'client'
  | 'individual'
  | 'prospect'
  | 'supplier'
  | 'internal'
  | 'solicitation'
  | 'other';

export const isInternalRelationValue = (value?: string | null): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.startsWith('interne') && normalized.includes('cir');
};

export const isSolicitationRelationValue = (value?: string | null): boolean =>
  (value ?? '').trim().toLowerCase() === SOLICITATION_RELATION_NORMALIZED;

export const isClientRelationValue = (value?: string | null): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'client'
    || normalized === 'client à terme'
    || normalized === 'client a terme'
    || normalized === 'client comptant';
};

export const isIndividualRelationValue = (value?: string | null): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'particulier';
};

export const isProspectRelationValue = (value?: string | null): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'prospect';
};

export const isSupplierRelationValue = (value?: string | null): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'fournisseur';
};

export const relationValuesMatch = (selectedEntityType: string, targetRelation: string): boolean => {
  if (isClientRelationValue(targetRelation)) return isClientRelationValue(selectedEntityType);
  if (isIndividualRelationValue(targetRelation)) return isIndividualRelationValue(selectedEntityType);
  if (isProspectRelationValue(targetRelation)) return isProspectRelationValue(selectedEntityType);
  if (isSupplierRelationValue(targetRelation)) return isSupplierRelationValue(selectedEntityType);
  if (isInternalRelationValue(targetRelation)) return isInternalRelationValue(selectedEntityType);
  if (isSolicitationRelationValue(targetRelation)) return isSolicitationRelationValue(selectedEntityType);
  return selectedEntityType.trim().toLowerCase() === targetRelation.trim().toLowerCase();
};

export const normalizeVisibleRelationValue = (value?: string | null): string => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'client') return TERM_CLIENT_RELATION_LABEL;
  if (normalized === 'prospect / particulier') return PROSPECT_RELATION_LABEL;
  const matchingOption = PRODUCT_RELATION_OPTIONS.find((option) => option.trim().toLowerCase() === normalized);
  return matchingOption ?? '';
};

export const getRelationLabelForTierType = (type: TierV1DirectoryRow['type']): string => {
  if (type === 'client_cash') return CASH_CLIENT_RELATION_LABEL;
  if (type === 'individual') return INDIVIDUAL_RELATION_LABEL;
  if (type === 'prospect_company' || type === 'prospect_individual') return PROSPECT_RELATION_LABEL;
  if (type === 'supplier') return SUPPLIER_RELATION_LABEL;
  if (type === 'internal_cir') return INTERNAL_RELATION_LABEL;
  if (type === 'solicitation') return SOLICITATION_RELATION_LABEL;
  return TERM_CLIENT_RELATION_LABEL;
};

export const getTierTypeDisplayLabel = (type: TierV1DirectoryRow['type']): string => {
  if (type === 'client_term') return TERM_CLIENT_RELATION_LABEL;
  if (type === 'client_cash') return CASH_CLIENT_RELATION_LABEL;
  if (type === 'individual') return INDIVIDUAL_RELATION_LABEL;
  if (type === 'prospect_company') return 'Prospect société';
  if (type === 'prospect_individual') return 'Prospect personne';
  if (type === 'supplier') return SUPPLIER_RELATION_LABEL;
  if (type === 'internal_cir') return INTERNAL_RELATION_LABEL;
  return SOLICITATION_RELATION_LABEL;
};

export const getRelationMode = (value?: string | null): RelationMode => {
  if (isClientRelationValue(value)) return 'client';
  if (isIndividualRelationValue(value)) return 'individual';
  if (isSupplierRelationValue(value)) return 'supplier';
  if (isInternalRelationValue(value)) return 'internal';
  if (isSolicitationRelationValue(value)) return 'solicitation';
  if (isProspectRelationValue(value)) return 'prospect';

  return 'other';
};

export const ensureInternalRelation = (relations: string[]): string[] => {
  const exists = relations.some((relation) => isInternalRelationValue(relation));
  return exists ? relations : [...relations, INTERNAL_RELATION_LABEL];
};
