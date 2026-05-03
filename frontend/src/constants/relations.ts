export const INTERNAL_RELATION_LABEL = 'Interne (CIR)';
export const SOLICITATION_RELATION_NORMALIZED = 'sollicitation';
export const INTERNAL_COMPANY_NAME = 'CIR';
export const TERM_CLIENT_RELATION_LABEL = 'Client à terme';
export const CASH_CLIENT_RELATION_LABEL = 'Client comptant';
export const INDIVIDUAL_RELATION_LABEL = 'Particulier';
export const PROSPECT_RELATION_LABEL = 'Prospect';
export const SUPPLIER_RELATION_LABEL = 'Fournisseur';
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
